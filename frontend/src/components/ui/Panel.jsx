export function Panel({ title, children, style = {}, action }) {
  return (
    <div className="panel" style={style}>
      {title && (
        <div className="panel-header">
          <span>{title}</span>
          {action && action}
        </div>
      )}
      {children}
    </div>
  )
}