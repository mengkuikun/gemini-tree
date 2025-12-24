
export enum TreeState {
  COLLAPSED = 'COLLAPSED',
  SCATTERED = 'SCATTERED',
  PHOTO_ZOOM = 'PHOTO_ZOOM'
}

export interface HandData {
  landmarks: any[];
  gesture: 'fist' | 'open' | 'grab' | 'none';
  rotation: { x: number; y: number };
  position: { x: number; y: number };
}

export interface PhotoData {
  id: string;
  url: string;
}
