import { prisma } from '../../../core/lib/prisma';

export default async function DashboardPage() {
  const besoinsCount = await prisma.besoin.count();
  const adherentsCount = await prisma.adherent.count();
  const ideesCount = await prisma.idee.count();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Tableau de bord</h1>
      <p className="text-gray-600 mb-8">Vue d'ensemble du mouvement JÀMM AK XÉEWAL</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Signalements</h3>
          <p className="text-4xl font-black text-brand-green">{besoinsCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Adhérents</h3>
          <p className="text-4xl font-black text-brand-green">{adherentsCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
          <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Idées</h3>
          <p className="text-4xl font-black text-brand-green">{ideesCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow border border-gray-100">
        <h3 className="text-lg font-black text-gray-900 mb-4">Raccourci quartiers</h3>
        <p className="text-gray-500">Gérez vos quartiers depuis l'onglet Options</p>
      </div>
    </div>
  );
}
