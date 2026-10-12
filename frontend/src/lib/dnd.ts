import { pointerWithin, rectIntersection } from '@dnd-kit/core'
import type { CollisionDetection, UniqueIdentifier } from '@dnd-kit/core'

/** 分组拖动排序用的 sortable id 前缀（`group:<id>`）。 */
export const isGroupId = (id: UniqueIdentifier) => String(id).startsWith('group:')
/** 分组顶部「插到最前」细条投放区（`section-start:<key>`）。 */
const isTopStripId = (id: UniqueIdentifier) => String(id).startsWith('section-start:')
/** 非卡片投放区：分组容器、顶部细条、整块看板容器（`board:end`）。 */
const isContainerId = (id: UniqueIdentifier) =>
  String(id).startsWith('section:') ||
  String(id).startsWith('section-start:') ||
  String(id).startsWith('board')

function center(rect: { left: number; top: number; width: number; height: number }) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function distanceTo(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/** 用「指针坐标」而不是 dragged rect 中心来选最近目标，否则命中会跟着拖拽浮层偏移。 */
function nearestToPointer(
  args: Parameters<CollisionDetection>[0],
  collisions: ReturnType<CollisionDetection>,
) {
  const { pointerCoordinates, droppableRects } = args
  if (!pointerCoordinates) return collisions[0]
  return collisions
    .map((collision) => {
      const rect = droppableRects.get(collision.id)
      return {
        collision,
        distance: rect ? distanceTo(center(rect), pointerCoordinates) : Number.POSITIVE_INFINITY,
      }
    })
    .sort((a, b) => a.distance - b.distance)[0].collision
}

/**
 * 看板通用碰撞策略（分组看板与不分组看板共用，按 active id 前缀分流）：
 *
 * 分组拖拽（`group:*`）：只在分组卡片之间取指针下最近的一个，
 * 否则分组手柄会命中自己内部的任务卡 / 容器，导致永远排不动。
 *
 * 任务拖拽（按优先级）：
 * 1. 分组顶部的「插到最前」细条（section-start:）命中时优先，否则 8px 细条抢不过卡片；
 * 2. 否则在命中的任务卡里取「距指针最近」的一张（pointerWithin 常有多张卡同时命中）；
 * 3. 没命中卡片时取容器（分组容器 / 整块看板），指针不在任何投放区时回退矩形相交。
 */
export const boardCollisionDetection: CollisionDetection = (args) => {
  if (args.active && isGroupId(args.active.id)) {
    const groupContainers = args.droppableContainers.filter((container) =>
      isGroupId(container.id),
    )
    const groupArgs = { ...args, droppableContainers: groupContainers }
    const hits = pointerWithin(groupArgs)
    const collisions = hits.length > 0 ? hits : rectIntersection(groupArgs)
    if (collisions.length === 0) return []
    return [nearestToPointer(args, collisions)]
  }

  const candidates = pointerWithin(args)
  const collisions = candidates.length > 0 ? candidates : rectIntersection(args)

  const topStrips = collisions.filter((c) => isTopStripId(c.id))
  if (topStrips.length > 0) return topStrips

  const cards = collisions.filter((c) => !isContainerId(c.id))
  if (cards.length > 0) {
    return [nearestToPointer(args, cards)]
  }

  const containers = collisions.filter((c) => isContainerId(c.id))
  return containers.length > 0 ? containers : collisions
}
