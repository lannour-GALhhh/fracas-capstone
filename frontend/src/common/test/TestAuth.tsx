import { useAuth } from '@/features/auth/context/useAuth'
import React from 'react'
import { Button } from '@/common/ui/button';


const TestAuth = () => {

  const { login, logout } = useAuth();

  return (
    <div>
      <div>
        <h5>Positive Login</h5>
        <Button>
          Login
        </Button>
      </div>
      <div>
        <h5>Logout</h5>
        <button className='bg-black text-white p-1'
         onClick={() => logout()}>Logout</button>
      </div>
    </div>
  )
}

export default TestAuth