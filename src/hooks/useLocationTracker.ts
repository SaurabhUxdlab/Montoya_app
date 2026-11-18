import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { useAppDispatch } from './redux';
import { updateLocation, setError } from '../store/slices/attendanceSlice';

export function useLocationTracker() {
  const dispatch = useAppDispatch();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const requestAndFetchLocation = useCallback(async () => {
    setIsFetching(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);

      if (granted) {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        dispatch(
          updateLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? 5,
            altitude: position.coords.altitude ?? undefined,
          })
        );
      } else {
        dispatch(setError('Location permission not granted'));
      }
    } catch (err: any) {
      console.error('Error fetching position:', err);
      dispatch(setError(err?.message || 'Failed to get location'));
    } finally {
      setIsFetching(false);
    }
  }, [dispatch]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    async function startWatching() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync();
          if (req.status !== 'granted') {
            setHasPermission(false);
            return;
          }
        }
        setHasPermission(true);

        // Initial quick fetch
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        dispatch(
          updateLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? 5,
            altitude: pos.coords.altitude ?? undefined,
          })
        );

        // Watch for location changes (every 5 seconds or 5 meters distance delta)
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (newPos) => {
            dispatch(
              updateLocation({
                latitude: newPos.coords.latitude,
                longitude: newPos.coords.longitude,
                accuracy: newPos.coords.accuracy ?? 5,
                altitude: newPos.coords.altitude ?? undefined,
              })
            );
          }
        );
      } catch (err: any) {
        console.error('Error starting location watcher:', err);
        dispatch(setError(err?.message || 'Failed to watch location'));
      }
    }

    startWatching();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [dispatch]);

  return {
    hasPermission,
    isFetching,
    refetchLocation: requestAndFetchLocation,
  };
}
