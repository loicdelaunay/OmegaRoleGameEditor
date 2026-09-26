export function MassReparentingBanner() {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'var(--md-sys-color-primary-container, #d3e3fd)',
      color: 'var(--md-sys-color-on-primary-container, #041e49)',
      padding: '16px 24px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      zIndex: 9999,
      fontWeight: 500,
      pointerEvents: 'none',
      textAlign: 'center'
    }}>
      Modification des parents de masse en cours<br />merci de clique sur un item pour l'assigner en parent
    </div>
  )
}
