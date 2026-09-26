import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  moduleName: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AudioErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Audio module (${this.props.moduleName}) error:`, error, errorInfo)
  }

  public reset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'var(--md-sys-color-error-container, #ffdad6)',
          color: 'var(--md-sys-color-on-error-container, #410002)',
          padding: '16px',
          borderRadius: '8px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          border: '1px solid var(--md-sys-color-error, #ba1a1a)',
          maxWidth: '350px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <AlertCircle size={20} />
            <span>Erreur du module {this.props.moduleName}</span>
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {this.state.error?.message || 'Erreur inconnue'}
          </div>
          <button 
            onClick={this.reset}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px',
              backgroundColor: 'var(--md-sys-color-error, #ba1a1a)',
              color: 'var(--md-sys-color-on-error, #ffffff)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            <RefreshCw size={16} /> Recharger le module
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
