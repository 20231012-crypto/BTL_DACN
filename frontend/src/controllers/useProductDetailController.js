/**
 * Product Detail Controller: loads product specification, reviews, related products, and quantity state.
 */
import { useEffect, useState } from 'react';
import {
  fetchProductDetail,
  fetchRelatedProducts,
} from '../models/catalogModel.js';
import { useApp } from './AppContext.jsx';

export function useProductDetailController(id) {
  const { addToCart, setChatOpen, isWishlisted, toggleWishlist } = useApp();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setProduct(null);
    setRelated([]);
    fetchProductDetail(id)
      .then((item) => {
        setProduct(item);
        if (item?.categoryId) {
          fetchRelatedProducts(item.categoryId, item.id)
            .then(setRelated)
            .catch(() => {});
        }
      })
      .catch((e) => setError(e.message));
  }, [id]);

  return {
    product,
    related,
    error,
    quantity,
    setQuantity,
    addToCart,
    openChat: () => setChatOpen(true),
    isWishlisted,
    toggleWishlist,
  };
}
