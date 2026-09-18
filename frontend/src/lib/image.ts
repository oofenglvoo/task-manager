function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('解析图片失败'))
    }
    image.src = url
  })
}

export async function fileToUploadBlob(
  file: File,
  maxWidth = 1920,
  quality = 0.85,
): Promise<Blob> {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file

  const image = await loadImage(file)
  if (image.width <= maxWidth && file.size <= 2 * 1024 * 1024) return file

  const scale = Math.min(1, maxWidth / image.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  return blob ?? file
}
