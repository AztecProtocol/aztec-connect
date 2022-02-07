import { useEffect, useState } from 'react';
import { useApp } from './app_context';

export function useAssetPrice(assetId: number) {
  const { priceFeedService } = useApp();
  const [price, setPrice] = useState<bigint>();
  useEffect(() => {
    setPrice(priceFeedService.getPrice(assetId));
    const handlePriceChange = (_: number, newPrice: bigint) => {
      setPrice(newPrice);
    };
    priceFeedService.subscribe(assetId, handlePriceChange);
    return () => {
      priceFeedService.unsubscribe(assetId, handlePriceChange);
    };
  }, [assetId, priceFeedService]);
  return price;
}

export function useAssetPrices(assetIds: number[]) {
  const { priceFeedService } = useApp();
  const [prices, setPrices] = useState<Record<number, bigint | undefined>>({});
  useEffect(() => {
    const unlisteners = assetIds.map(id => {
      const handlePriceChange = (_: number, newPrice: bigint) => {
        setPrices(prices => ({ ...prices, [id]: newPrice }));
      };
      handlePriceChange(id, priceFeedService.getPrice(id));
      priceFeedService.subscribe(id, handlePriceChange);
      return () => {
        priceFeedService.unsubscribe(id, handlePriceChange);
      };
    });
    return () => {
      for (const unlisten of unlisteners) unlisten();
    };
  }, [priceFeedService, assetIds]);
  return prices;
}
