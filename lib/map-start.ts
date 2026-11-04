import { inUSBounds } from './domain.ts';

export const MANHATTAN = { lat: 40.758, lon: -73.9855 };
export type MapLocation = { lat: number; lon: number };
type Result = { location: MapLocation; reason: 'located' | 'denied' | 'unavailable' | 'outside-us' };
type Geo = Pick<Geolocation, 'getCurrentPosition'>;

// No reverse lookup, persistence, or paid request. Browsers own the permission prompt.
export function requestMapLocation(geo?: Geo): Promise<Result> {
  if (!geo) return Promise.resolve({location: MANHATTAN, reason: 'unavailable'});
  return new Promise(resolve => {
    let finished = false;
    const finish = (result: Result) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(result);
    };
    // Also covers a browser leaving its permission prompt unanswered indefinitely.
    const timer = setTimeout(() => finish({location: MANHATTAN, reason: 'unavailable'}), 8000);
    try {
      geo.getCurrentPosition(position => {
        const {latitude: lat, longitude: lon} = position.coords;
        finish(inUSBounds(lat,lon)
          ? {location: {lat,lon}, reason: 'located'}
          : {location: MANHATTAN, reason: 'outside-us'});
      }, error => finish({location: MANHATTAN, reason: error.code === 1 ? 'denied' : 'unavailable'}),
      {timeout: 6000, maximumAge: 300000, enableHighAccuracy: false});
    } catch { finish({location: MANHATTAN, reason: 'unavailable'}); }
  });
}

// Share the startup request across React Strict Mode mounts; explicit retries stay fresh.
let startup: Promise<Result> | undefined;
export function startupMapLocation(geo?: Geo) {
  return startup ??= requestMapLocation(geo);
}
