/**
 * Toast notification wrapper
 * Using native alert for now - can be replaced with a proper toast library
 */

export const toast = {
  success: (message: string) => {
    console.log('[SUCCESS]', message)
    // You can replace with sonner or react-hot-toast later
    alert(`✓ ${message}`)
  },
  error: (message: string) => {
    console.error('[ERROR]', message)
    alert(`✗ ${message}`)
  },
  info: (message: string) => {
    console.info('[INFO]', message)
    alert(message)
  },
}
