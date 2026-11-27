// Data sources panel (ADR 0009). A static list: nothing here is connected or stored.
// "live" and "synthetic" are the sources the demo really uses; "available" are examples of what a pilot could add.

export type SourceStatus = 'live' | 'synthetic' | 'available'

export interface DataSource {
  id: string
  name: string
  /** What the source adds to the dashboard, in aggregated numbers. */
  adds: string
  status: SourceStatus
}

export const NOT_CONNECTED_LABEL = 'Demo: not connected'

export const PILOT_NOTE =
  'Not connected in this demo. In a pilot, fairafric grants Finde read-only access, and only aggregated numbers per SKU, campaign and market come in.'

export const DATA_SOURCES: DataSource[] = [
  { id: 'qr-scans', name: 'QR scans', adds: 'Scans per code, SKU, campaign and market', status: 'live' },
  { id: 'feedback', name: 'Feedback form', adds: 'Ratings and taste notes per SKU', status: 'live' },
  { id: 'web-analytics', name: 'Website analytics', adds: 'Sessions, page views, video plays and shop clicks', status: 'synthetic' },
  { id: 'online-shop', name: 'Online shop (e.g. Shopify)', adds: 'Orders and revenue per SKU after a scan campaign', status: 'available' },
  { id: 'google-analytics', name: 'Google Analytics 4', adds: 'Visits to fairafric.com per campaign and market', status: 'available' },
  { id: 'social', name: 'Instagram and Facebook', adds: 'Reach and link clicks per campaign post', status: 'available' },
  { id: 'youtube', name: 'YouTube channel', adds: 'Views of the story videos linked from the pack', status: 'available' },
  { id: 'retail-sell-out', name: 'Retailer sell-out file', adds: 'Weekly units sold per store and market (CSV upload)', status: 'available' },
  { id: 'newsletter', name: 'Newsletter (e.g. Mailchimp)', adds: 'Click-throughs to product pages per campaign', status: 'available' },
]
