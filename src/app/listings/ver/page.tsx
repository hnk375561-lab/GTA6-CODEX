'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

type Listing = {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  version: string | null;
  year: number | null;
  mileage_km: number | null;
  price_amount: number | null;
  price_currency: string | null;
  price_type: string | null;
  description: string | null;
  condition_details: Record<string, unknown>;
  category_id: string;
  condition_id: string;
  accepts_trade: boolean;
  accepts_financing: boolean;
  has_title: boolean | null;
  title_status: string | null;
  // Sección 4.7: opcional a propósito — un listing sin match exacto en el
  // catálogo (brand/model/version tipeados libres por el vendedor) igual
  // debe poder existir con esto en null (criterio de aceptación de Fase 3).
  vehicle_model_slug: string | null;
};

type VehicleModel = {
  slug: string;
  manufacturer: string;
  title: string;
  class: string | null;
};

type Media = {
  id: string;
  url: string;
  position: number;
  is_cover: boolean;
};

function ListingContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [listing, setListing] = useState<Listing | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [conditionLabel, setConditionLabel] = useState<string | null>(null);
  const [vehicleModel, setVehicleModel] = useState<VehicleModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) {
        setError('Falta el parámetro id en la URL (?id=...)');
        setLoading(false);
        return;
      }

      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single();

      if (listingError || !listingData) {
        setError(listingError?.message ?? 'Publicación no encontrada');
        setLoading(false);
        return;
      }

      setListing(listingData);

      const [{ data: mediaData }, { data: categoryData }, { data: conditionData }] =
        await Promise.all([
          supabase
            .from('listing_media')
            .select('id, url, position, is_cover')
            .eq('listing_id', id)
            .order('position'),
          supabase
            .from('vehicle_categories')
            .select('name')
            .eq('id', listingData.category_id)
            .single(),
          supabase
            .from('vehicle_conditions')
            .select('label')
            .eq('id', listingData.condition_id)
            .single(),
        ]);

      setMedia(mediaData ?? []);
      setCategoryName(categoryData?.name ?? listingData.category_id);
      setConditionLabel(conditionData?.label ?? listingData.condition_id);

      // vehicle_model_slug es opcional (sección 4.7): si es null, no hay
      // nada que buscar y la página debe seguir funcionando igual — no es
      // un error, es el caso normal de "sin match en el catálogo".
      if (listingData.vehicle_model_slug) {
        const { data: modelData } = await supabase
          .from('vehicle_models')
          .select('slug, manufacturer, title, class')
          .eq('slug', listingData.vehicle_model_slug)
          .maybeSingle();
        setVehicleModel(modelData ?? null);
      }

      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p style={{ padding: 32 }}>Cargando…</p>;
  if (error) return <p style={{ padding: 32, color: '#c0392b' }}>{error}</p>;
  if (!listing) return null;

  const cover = media.find((m) => m.is_cover) ?? media[0];

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto', fontFamily: 'sans-serif' }}>
      {cover && (
        <img
          src={cover.url}
          alt={listing.title}
          style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 8 }}
        />
      )}

      <h1 style={{ marginTop: 24 }}>{listing.title}</h1>

      <p style={{ fontSize: 24, fontWeight: 700 }}>
        {listing.price_type === 'on_request' || !listing.price_amount
          ? 'Precio a convenir'
          : `${listing.price_currency ?? 'ARS'} ${listing.price_amount.toLocaleString('es-AR')}`}
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#555', marginBottom: 16 }}>
        {listing.year && <span>{listing.year}</span>}
        {listing.mileage_km != null && <span>{listing.mileage_km.toLocaleString('es-AR')} km</span>}
        {categoryName && <span>{categoryName}</span>}
        {conditionLabel && (
          <span style={{ fontWeight: 600, color: '#c0392b' }}>{conditionLabel}</span>
        )}
      </div>

      {vehicleModel && (
        <p style={{ marginBottom: 16 }}>
          Coincide con la ficha técnica del catálogo:{' '}
          <Link href={`/vehiculos/${vehicleModel.slug}`} style={{ color: '#c0392b', fontWeight: 600 }}>
            {vehicleModel.manufacturer} {vehicleModel.title}
          </Link>
        </p>
      )}

      {listing.description && (
        <>
          <h2>Descripción</h2>
          <p>{listing.description}</p>
        </>
      )}

      {listing.condition_details && Object.keys(listing.condition_details).length > 0 && (
        <>
          <h2>Detalles de condición declarados por el vendedor</h2>
          <ul>
            {Object.entries(listing.condition_details).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {String(value)}
              </li>
            ))}
          </ul>
        </>
      )}

      <div style={{ marginTop: 16, fontSize: 14, color: '#888' }}>
        {listing.accepts_trade && <p>Acepta permuta</p>}
        {listing.accepts_financing && <p>Acepta financiación</p>}
        {listing.has_title != null && (
          <p>Documentación: {listing.has_title ? 'al día' : listing.title_status ?? 'a confirmar'}</p>
        )}
      </div>

      {media.length > 1 && (
        <>
          <h2>Más fotos</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {media
              .filter((m) => m.id !== cover?.id)
              .map((m) => (
                <img
                  key={m.id}
                  src={m.url}
                  alt=""
                  style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 4 }}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ListingPage() {
  return (
    <Suspense fallback={<p style={{ padding: 32 }}>Cargando…</p>}>
      <ListingContent />
    </Suspense>
  );
}
