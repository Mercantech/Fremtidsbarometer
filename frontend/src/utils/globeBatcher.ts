import type { LiveTopic, GlobeConfig } from '../store/useStore';

interface UnitVector {
  x: number;
  y: number;
  z: number;
}

/**
 * Converts latitude and longitude in degrees to a 3D unit sphere vector.
 */
function toUnitVector(lat: number, lng: number): UnitVector {
  const radLat = lat * (Math.PI / 180);
  const radLng = lng * (Math.PI / 180);
  return {
    x: Math.cos(radLat) * Math.sin(radLng),
    y: Math.sin(radLat),
    z: Math.cos(radLat) * Math.cos(radLng),
  };
}

/**
 * Computes Euclidean distance between two unit vectors on the sphere.
 * (Equivalent to 2 * sin(theta / 2)).
 */
function unitDistance(a: UnitVector, b: UnitVector): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Minimum distance (~20 degrees angular distance on sphere) to prevent visual clustering in the same batch
const MIN_SPATIAL_DISTANCE = 0.35;

/**
 * Calculates priority weight for ranking jobs.
 */
function scoreJob(t: LiveTopic, config: GlobeConfig): number {
  let score = 0;
  if (t.is_hot) score += 6;
  if (config.prioritize_trending_tech && (t.is_hot || (t.hype_score && t.hype_score > 0.4))) score += 4;
  if (config.prioritize_salary && (t.meta?.medianSalary || t.meta?.salaryMin)) score += 3;
  if (t.hype_score) score += t.hype_score * 3;
  return score;
}

/**
 * Partitions the pool of LiveTopics into rotating, spatially dispersed batches.
 * Guarantees that items in the same batch do not visually collide/overlap on the globe.
 */
export function generateDispersedBatches(
  topics: LiveTopic[],
  config: GlobeConfig
): LiveTopic[][] {
  if (!topics || topics.length === 0) {
    return [[]];
  }

  const limit = Math.max(4, Math.min(config.max_visible_pins || 14, 30));

  // If the total pool is within single-batch limit, check if any overlap
  if (topics.length <= limit) {
    return [topics];
  }

  // Pre-calculate 3D unit coordinates for all items
  const vectorMap = new Map<string, UnitVector>();
  topics.forEach((t) => {
    vectorMap.set(t.id, toUnitVector(t.lat, t.lng));
  });

  // Separate and prioritize items by type
  const hypeTopics = topics
    .filter((t) => t.type === 'hype')
    .sort((a, b) => (b.hype_score || 0) - (a.hype_score || 0));

  const jobTopics = topics
    .filter((t) => t.type === 'job' || t.type === 'salary')
    .sort((a, b) => scoreJob(b, config) - scoreJob(a, config));

  const hypeRatio = (config.hype_ratio ?? 50) / 100;
  const targetHypePerBatch = Math.round(limit * hypeRatio);
  const targetJobsPerBatch = limit - targetHypePerBatch;

  // Determine number of batches needed to cycle through pool
  const totalItems = topics.length;
  const numBatches = Math.max(2, Math.min(8, Math.ceil(totalItems / limit)));

  const batches: LiveTopic[][] = Array.from({ length: numBatches }, () => []);

  // Track how many times each item has been assigned
  const usageCount = new Map<string, number>();
  topics.forEach((t) => usageCount.set(t.id, 0));

  // Helper to test if a candidate has sufficient spatial separation from all items currently in a batch
  const isSpatiallyDispersed = (
    candidate: LiveTopic,
    currentBatch: LiveTopic[],
    minDist: number
  ): boolean => {
    const candVec = vectorMap.get(candidate.id);
    if (!candVec) return true;

    for (const existing of currentBatch) {
      const existVec = vectorMap.get(existing.id);
      if (existVec && unitDistance(candVec, existVec) < minDist) {
        return false;
      }
    }
    return true;
  };

  // Populate batches round-robin with spatial dispersion
  for (let b = 0; b < numBatches; b++) {
    const currentBatch = batches[b];

    // 1. Pick Hype topics for this batch
    const candidateHypes = [...hypeTopics].sort(
      (a, b) => (usageCount.get(a.id) || 0) - (usageCount.get(b.id) || 0)
    );

    let hypesAdded = 0;
    for (const h of candidateHypes) {
      if (hypesAdded >= targetHypePerBatch) break;
      if (isSpatiallyDispersed(h, currentBatch, MIN_SPATIAL_DISTANCE)) {
        currentBatch.push(h);
        usageCount.set(h.id, (usageCount.get(h.id) || 0) + 1);
        hypesAdded++;
      }
    }

    // 2. Pick Job & Salary topics for this batch
    const candidateJobs = [...jobTopics].sort(
      (a, b) => (usageCount.get(a.id) || 0) - (usageCount.get(b.id) || 0)
    );

    let jobsAdded = 0;
    for (const j of candidateJobs) {
      if (jobsAdded >= targetJobsPerBatch) break;
      if (isSpatiallyDispersed(j, currentBatch, MIN_SPATIAL_DISTANCE)) {
        currentBatch.push(j);
        usageCount.set(j.id, (usageCount.get(j.id) || 0) + 1);
        jobsAdded++;
      }
    }

    // 3. Fallback fill: if batch is still under limit due to strict spatial distance,
    // relax distance slightly (0.22) to utilize remaining slots without tight collisions
    if (currentBatch.length < limit) {
      const remainingCandidates = [...topics]
        .filter((t) => !currentBatch.some((x) => x.id === t.id))
        .sort((a, b) => (usageCount.get(a.id) || 0) - (usageCount.get(b.id) || 0));

      for (const cand of remainingCandidates) {
        if (currentBatch.length >= limit) break;
        if (isSpatiallyDispersed(cand, currentBatch, 0.22)) {
          currentBatch.push(cand);
          usageCount.set(cand.id, (usageCount.get(cand.id) || 0) + 1);
        }
      }
    }
  }

  // Filter out any empty batches
  const validBatches = batches.filter((b) => b.length > 0);
  return validBatches.length > 0 ? validBatches : [topics.slice(0, limit)];
}
