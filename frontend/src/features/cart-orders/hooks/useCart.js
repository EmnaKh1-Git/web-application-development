import { PERMISSIONS } from '@smart-ecommerce/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth/useAuth';
import { notifyError } from '@/shared/utils/notify';
import { cartApi, orderKeys } from '../api/ordersApi';

/**
 * Panier de l'utilisateur connecté (uniquement pour les rôles qui ont cart:manage).
 * @example const { data: cart } = useCart(); cart?.totalItems
 */
export function useCart() {
  const { hasPermission } = useAuth();
  return useQuery({
    queryKey: orderKeys.cart,
    queryFn: cartApi.get,
    enabled: hasPermission(PERMISSIONS.CART_MANAGE),
  });
}

/**
 * Ajout au panier avec notification « Voir le panier ».
 * @example const addToCart = useAddToCart(); addToCart.mutate({ productId, quantity, size, color });
 */
export function useAddToCart() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: cartApi.addItem,
    onSuccess: (cart, item) => {
      queryClient.setQueryData(orderKeys.cart, cart);
      const line = cart.items.find((cartItem) => cartItem.productId === item.productId);
      toast.success('Ajouté au panier', {
        description: line?.name,
        action: { label: 'Voir le panier', onClick: () => navigate('/cart') },
      });
    },
    onError: notifyError,
  });
}
