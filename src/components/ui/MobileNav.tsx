import React from 'react'
import { LayoutDashboard, Settings, FileSearch } from 'lucide-react'

interface MobileNavProps {
    currentView: 'dashboard' | 'settings' | 'onboarding' | 'plan-import'
    onNavigate: (view: 'dashboard' | 'settings' | 'onboarding' | 'plan-import') => void
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate }) => {
    if (currentView === 'onboarding') return null

    return (
        <nav className="sm:hidden h-16 bg-pipboy-surface border-t border-pipboy-border flex items-center justify-around px-4 pb-safe">
            <button
                onClick={() => onNavigate('dashboard')}
                className={`flex flex-col items-center gap-1 ${currentView === 'dashboard' ? 'text-pipboy-green' : 'text-pipboy-green-dim'
                    }`}
            >
                <LayoutDashboard size={20} />
                <span className="text-[10px] uppercase font-mono">Terminal</span>
            </button>

            <button
                onClick={() => onNavigate('plan-import')}
                className={`flex flex-col items-center gap-1 ${currentView === 'plan-import' ? 'text-pipboy-green' : 'text-pipboy-green-dim'
                    }`}
            >
                <FileSearch size={20} />
                <span className="text-[10px] uppercase font-mono">Import</span>
            </button>

            <button
                onClick={() => onNavigate('settings')}
                className={`flex flex-col items-center gap-1 ${currentView === 'settings' ? 'text-pipboy-green' : 'text-pipboy-green-dim'
                    }`}
            >
                <Settings size={20} />
                <span className="text-[10px] uppercase font-mono">System</span>
            </button>
        </nav>
    )
}
