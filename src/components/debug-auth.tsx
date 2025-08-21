import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

export function DebugAuth() {
  const { accessToken } = useAuthStore((state) => state.auth)
  
  useEffect(() => {
    console.log('DebugAuth - Current token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'No token')
    
    // Check cookies
    const cookies = document.cookie
    console.log('All cookies:', cookies)
    
    // Test token validity if it exists
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]))
        console.log('Token payload:', payload)
        console.log('Token expires at:', new Date(payload.exp * 1000))
        console.log('Token is expired:', payload.exp * 1000 < Date.now())
      } catch (e) {
        console.error('Failed to decode token:', e)
      }
    }
  }, [accessToken])
  
  if (process.env.NODE_ENV !== 'development') return null
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      right: 0, 
      background: 'red', 
      color: 'white', 
      padding: '5px',
      fontSize: '12px',
      zIndex: 9999 
    }}>
      Token: {accessToken ? '✅' : '❌'}
    </div>
  )
}