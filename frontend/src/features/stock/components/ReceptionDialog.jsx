import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ClipboardPaste, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { aiApi, aiKeys } from '@/features/ai/api/aiApi';
import { AiBadge } from '@/features/ai/components/AiBadge';
import { productKeys } from '@/features/products/api/productsApi';
import { Alert } from '@/shared/components/ui/Alert';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Dialog } from '@/shared/components/ui/Dialog';
import { fieldClassName } from '@/shared/components/ui/fieldStyles';
import { FilterTabs } from '@/shared/components/ui/FilterTabs';
import { TextAreaField } from '@/shared/components/ui/TextAreaField';
import { formatNumber } from '@/shared/utils/format';
import { notifyError, notifySuccess } from '@/shared/utils/notify';
import { stockApi, stockKeys } from '../api/stockApi';

const SAMPLE_NOTE = [
  'Bon de livraison n° FR-2026-118',
  'Fournisseur : TechDistrib Tunis',
  '12 x IPHONE 13 PRO 128GB',
  'Ecouteurs Beats Flex - 20',
  '6 x Raquette tennis',
  'Balles tennis lot de 3 ; 30',
  '4 x Casque Sony WH-1000XM5',
  'Total : 72 articles',
].join('\n');

const STATUS = {
  matched: { label: 'Reconnu', tone: 'success' },
  ambiguous: { label: 'À vérifier', tone: 'warning' },
  unknown: { label: 'Inconnu', tone: 'danger' },
};

/** Photo réduite (1600 px max, JPEG) pour un envoi rapide ; renvoie { image (base64), mediaType }. */
async function compressPhoto(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  return { image: dataUrl.split(',')[1], mediaType: 'image/jpeg', preview: dataUrl };
}

/**
 * Réception intelligente d'une livraison fournisseur : l'IA lit le bon (texte collé, ou photo
 * avec Claude), reconnaît les produits, puis le gestionnaire vérifie et valide.
 * Rien n'est enregistré avant la validation.
 */
export function ReceptionDialog({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Réception intelligente"
      description="Collez ou photographiez le bon de livraison : l’IA reconnaît les produits et les quantités."
    >
      {open && <Reception onClose={onClose} />}
    </Dialog>
  );
}

function Reception({ onClose }) {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: aiKeys.status, queryFn: aiApi.status });
  const canReadPhotos = Boolean(statusQuery.data?.claudeConfigured);
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const [lines, setLines] = useState([]);

  const analyze = useMutation({
    mutationFn: aiApi.reception,
    onSuccess: (data) => {
      setResult(data);
      setLines(data.lines.map((line) => ({ ...line, selectedId: line.productId ?? '' })));
    },
    onError: notifyError,
  });

  const selected = lines.filter((line) => line.selectedId && line.quantity > 0);
  const apply = useMutation({
    mutationFn: async () => {
      const reason = `Réception${result.reference ? ` BL ${result.reference}` : ''} (lue par l’IA)`;
      for (const line of selected) {
        await stockApi.add(Number(line.selectedId), { quantity: Number(line.quantity), reason });
      }
    },
    onSuccess: async () => {
      notifySuccess(
        'Réception enregistrée',
        `${selected.length} produit(s) réapprovisionné(s), ${formatNumber(
          selected.reduce((total, line) => total + Number(line.quantity), 0),
        )} unité(s).`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        queryClient.invalidateQueries({ queryKey: aiKeys.all }),
      ]);
      onClose();
    },
    onError: (error) => {
      notifyError(error);
      queryClient.invalidateQueries({ queryKey: stockKeys.all });
    },
  });

  const updateLine = (index, changes) =>
    setLines((current) =>
      current.map((line) => (line.index === index ? { ...line, ...changes } : line)),
    );

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-700">
            {result.reference ? (
              <>
                Bon <strong>{result.reference}</strong> ·{' '}
              </>
            ) : null}
            {result.summary.matched} reconnu(s), {result.summary.ambiguous} à vérifier,{' '}
            {result.summary.unknown} inconnu(s)
          </p>
          <AiBadge source={result.source} label="Lecture IA" />
        </div>
        {lines.length === 0 ? (
          <Alert variant="info">Aucune ligne « produit + quantité » n’a été reconnue.</Alert>
        ) : (
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Ligne du bon
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Produit reconnu
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Quantité
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <tr key={line.index}>
                    <td className="px-3 py-2 font-mono text-xs">{line.label}</td>
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Produit pour « ${line.label} »`}
                        value={line.selectedId}
                        onChange={(event) =>
                          updateLine(line.index, { selectedId: event.target.value })
                        }
                        className={fieldClassName({ className: 'py-1.5' })}
                      >
                        <option value="">— Ignorer cette ligne —</option>
                        {line.candidates.map((candidate) => (
                          <option key={candidate.productId} value={candidate.productId}>
                            {candidate.name} ({Math.round(candidate.score * 100)} %)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        aria-label={`Quantité pour « ${line.label} »`}
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(line.index, { quantity: event.target.value })
                        }
                        className={fieldClassName({ className: 'w-24 py-1.5' })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS[line.status].tone}>{STATUS[line.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap justify-between gap-2">
          <Button variant="ghost" onClick={() => setResult(null)} disabled={apply.isPending}>
            ← Recommencer
          </Button>
          <Button
            onClick={() => apply.mutate()}
            disabled={selected.length === 0}
            isLoading={apply.isPending}
          >
            Valider la réception ({selected.length} ligne{selected.length > 1 ? 's' : ''})
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterTabs
        label="Source du bon de livraison"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'text', label: 'Coller le texte' },
          { value: 'photo', label: 'Photo du bon' },
        ]}
      />
      {mode === 'text' ? (
        <>
          <TextAreaField
            label="Contenu du bon de livraison"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              'Une ligne par article, par exemple :\n12 x iPhone 13 Pro\nBalles de tennis - 30'
            }
          />
          <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE_NOTE)}>
            <ClipboardPaste aria-hidden="true" className="size-4" />
            Charger un exemple
          </Button>
        </>
      ) : canReadPhotos ? (
        <div className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-sm text-slate-600 hover:border-brand-400">
            <Camera aria-hidden="true" className="size-8 text-slate-400" />
            Prendre ou choisir une photo du bon
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) setPhoto(await compressPhoto(file));
              }}
            />
          </label>
          {photo && (
            <img
              src={photo.preview}
              alt="Bon de livraison à analyser"
              className="max-h-64 rounded-lg ring-1 ring-slate-200"
            />
          )}
        </div>
      ) : (
        <Alert variant="info" title="Lecture de photos indisponible">
          La lecture des photos utilise Claude (vision) : ajoutez une clé ANTHROPIC_API_KEY dans
          backend/.env pour l’activer. En attendant, collez le texte du bon.
        </Alert>
      )}
      <div className="flex justify-end">
        <Button
          isLoading={analyze.isPending}
          disabled={mode === 'text' ? !text.trim() : !photo}
          onClick={() =>
            analyze.mutate(
              mode === 'text' ? { text } : { image: photo.image, mediaType: photo.mediaType },
            )
          }
        >
          {!analyze.isPending && <ScanLine aria-hidden="true" className="size-4" />}
          Analyser le bon
        </Button>
      </div>
    </div>
  );
}
