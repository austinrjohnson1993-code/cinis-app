import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SortableTaskCard({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(id) })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 999 : undefined,
    position: isDragging ? 'relative' : undefined,
  }

  const dragHandleProps = { ...listeners, ...attributes }

  return (
    <div ref={setNodeRef} style={style}>
      {typeof children === 'function' ? children(dragHandleProps) : children}
    </div>
  )
}
