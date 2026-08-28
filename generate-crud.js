const fs = require('fs');
const path = require('path');

const entities = ['activites', 'besoins', 'commissions', 'adherents', 'idees', 'messages', 'sondages', 'comptes-rendus'];

// Mapping table to Prisma model name
const prismaModels = {
  'activites': 'activite',
  'besoins': 'besoin',
  'commissions': 'commission',
  'adherents': 'adherent',
  'idees': 'idee',
  'messages': 'message',
  'sondages': 'sondage',
  'comptes-rendus': 'compteRendu'
};

const baseDir = path.join(__dirname, 'src', 'app', 'api', 'v1');

for (const entity of entities) {
  const modelName = prismaModels[entity];
  const entityDir = path.join(baseDir, entity, '[id]');
  
  if (!fs.existsSync(entityDir)) {
    fs.mkdirSync(entityDir, { recursive: true });
  }

  const content = `import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { withAuth } from '../../../../../core/middlewares/authGuard';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  // Optionnel: Vous pouvez décommenter withAuth pour protéger explicitement au niveau Node 
  // (le middleware Edge s'en charge déjà, mais au cas où).
  try {
    const data = await req.json();
    const updated = await (prisma.${modelName} as any).update({
      where: { id: params.id },
      data
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await (prisma.${modelName} as any).delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: "Supprimé avec succès" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la suppression" }, { status: 500 });
  }
}
`;

  fs.writeFileSync(path.join(entityDir, 'route.ts'), content);
}
console.log('CRUD endpoints generated successfully!');
