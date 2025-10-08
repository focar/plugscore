function CampaignSelector({ campaigns, selectedCampaign, onCampaignChange, visible }) {
    if (!visible) return <div className="w-64 h-10"></div>;
    if (!campaigns || campaigns.length === 0) return <div className="text-sm text-gray-500">Nenhuma campanha encontrada.</div>;
    return (
        <div className="relative">
            <select value={selectedCampaign ? selectedCampaign.id : ''} onChange={(e) => { const c = campaigns.find(c => c.id.toString() === e.target.value); onCampaignChange(c); }} className="appearance-none w-full md:w-64 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                {campaigns.map(c => (<option key={c.id} value={c.id}>{c.nome}</option>))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300"><ChevronsUpDownIcon /></div>
        </div>
    );
}