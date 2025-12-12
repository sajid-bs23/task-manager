import { useParams } from 'react-router-dom'

export default function BoardView() {
  const { boardId } = useParams()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Board View</h1>
      <p>Board ID: {boardId}</p>
      <p>Clean slate. Board columns and tasks will go here.</p>
    </div>
  )
}
