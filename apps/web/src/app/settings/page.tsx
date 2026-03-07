'use client';

import { Settings as SettingsIcon } from 'lucide-react';
import {
    GlobalSettingsAlchemySection,
    GlobalSettingsCookingSection,
    GlobalSettingsInventorySection,
    GlobalSettingsMarketSection,
    GlobalSettingsOverviewCard,
} from '@/components/settings/GlobalSettingsSections';
import { useGlobalSettings } from '@/stores/global-settings-store';

export default function SettingsPage() {
    const settings = useGlobalSettings();

    const handleReset = () => {
        if (typeof window !== 'undefined' && !window.confirm('Deseja restaurar as configurações padrão?')) {
            return;
        }

        settings.reset();
    };

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <SettingsIcon size={24} />
                    Configurações
                </h1>
                <p className="text-sm text-secondary">
                    Ajuste bônus, maestria, tempos e inventário para manter os cálculos do projeto alinhados ao seu setup real.
                </p>
            </div>

            <GlobalSettingsOverviewCard settings={settings} onReset={handleReset} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <GlobalSettingsMarketSection settings={settings} />
                <GlobalSettingsInventorySection settings={settings} />
                <GlobalSettingsCookingSection settings={settings} />
                <GlobalSettingsAlchemySection settings={settings} />
            </div>
        </div>
    );
}
