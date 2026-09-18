import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      width="max-w-sm"
      footer={
        <>
          <Button onClick={onCancel} disabled={loading}>
            取消
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">{message ?? '此操作不可撤销。'}</p>
    </Modal>
  )
}
