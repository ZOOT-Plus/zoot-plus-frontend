import { Navigate, useParams } from 'react-router-dom'

export const CreatePage = () => {
  const { id } = useParams<{ id?: string }>()
  const target = id ? `/editor/${id}` : '/editor'

  return <Navigate to={target} replace />
}
