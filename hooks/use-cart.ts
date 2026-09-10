import { useState } from 'react'

export interface CartItem {
  id: string
  product_id: string
  name: string
  price: number
  quantity: number
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = (product: { id: string, name: string, price: number }) => {
    setItems(current => {
      const existing = current.find(i => i.product_id === product.id)
      if (existing) {
        return current.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...current, { id: crypto.randomUUID(), product_id: product.id, name: product.name, price: product.price, quantity: 1 }]
    })
  }

  const removeItem = (productId: string) => {
    setItems(current => current.filter(i => i.product_id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems(current => current.map(i => i.product_id === productId ? { ...i, quantity } : i))
  }

  const clearCart = () => setItems([])

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return { items, addItem, removeItem, updateQuantity, clearCart, total }
}
