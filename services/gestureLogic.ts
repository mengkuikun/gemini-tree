
import { HandData } from '../types';

export const analyzeHand = (landmarks: any[]): HandData['gesture'] => {
  if (!landmarks || landmarks.length === 0) return 'none';

  // Distance formula
  const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const palmBase = landmarks[0];

  // Distances to palm base
  const dIndex = dist(indexTip, palmBase);
  const dMiddle = dist(middleTip, palmBase);
  const dRing = dist(ringTip, palmBase);
  const dPinky = dist(pinkyTip, palmBase);

  // Thresholds (normalized 0-1)
  const fistThreshold = 0.15;
  const openThreshold = 0.35;
  const grabThreshold = 0.05;

  // Check Grab (Index and Thumb close together)
  if (dist(thumbTip, indexTip) < grabThreshold) {
    return 'grab';
  }

  // Check Fist (All finger tips close to palm)
  if (dIndex < fistThreshold && dMiddle < fistThreshold && dRing < fistThreshold && dPinky < fistThreshold) {
    return 'fist';
  }

  // Check Open
  if (dIndex > openThreshold && dMiddle > openThreshold && dRing > openThreshold && dPinky > openThreshold) {
    return 'open';
  }

  return 'none';
};
