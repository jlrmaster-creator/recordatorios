export default function Header({ title, left, right }) {
  return (
    <header className="app-header">
      <div style={{ width: 40, display: 'flex', alignItems: 'center' }}>
        {left}
      </div>
      <span className="header-title">{title}</span>
      <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        {right}
      </div>
    </header>
  )
}
