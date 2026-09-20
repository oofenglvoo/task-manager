import { Solar } from 'lunar-javascript'

/**
 * 农历（阴历）信息封装：组件不直接依赖 lunar-javascript。
 * 农历/节气/传统节日全部本地离线计算，无网络依赖。
 */
export interface LunarInfo {
  /** 农历日，如「初一」「廿三」。 */
  day: string
  /** 农历月，如「正月」「腊月」。 */
  month: string
  /** 节气名（当天为节气时非空），如「立春」。 */
  jieQi: string
  /** 节日名（农历传统节日 + 公历节日），取第一个，无则空。 */
  festival: string
}

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

export function weekLabel(week: number): string {
  return WEEK_LABELS[week] ?? ''
}

/**
 * 计算某公历日期的农历信息。
 * 优先级：节气 > 节日 > 农历月/日；月首（初一）显示农历月名，否则显示农历日。
 */
export function lunarInfo(year: number, month: number, day: number): LunarInfo {
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()
  const jieQi = lunar.getJieQi() ?? ''
  const festivals = [
    ...(solar.getFestivals() ?? []),
    ...(lunar.getFestivals() ?? []),
  ].filter(Boolean)
  const festival = festivals.length > 0 ? festivals.join(' ') : ''
  return {
    day: lunar.getDayInChinese(),
    month: lunar.getMonthInChinese(),
    jieQi,
    festival,
  }
}
