# Stripe - Configuración pendiente

## 1. Crear cuenta en Stripe
- Ir a https://dashboard.stripe.com/register
- Activar modo test para desarrollo

## 2. Crear productos y precios en Stripe Dashboard
- **Mensual**: 19,99 €/mes (recurrente mensual)
- **Semestral**: 89,94 € cada 6 meses
- **Anual**: 119,88 €/año

## 3. Rellenar `.env.local`
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_SEMESTRAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_ANNUAL=price_...
```

## 4. Configurar webhook
- En Stripe Dashboard > Developers > Webhooks
- Endpoint: `https://tudominio.com/api/stripe/webhook`
- Eventos a escuchar:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

### Para desarrollo local:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
(Requiere instalar [Stripe CLI](https://docs.stripe.com/stripe-cli))

## 5. Migración SQL en Supabase
Ejecutar en SQL Editor de Supabase:
```sql
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '14 days');
UPDATE restaurants SET trial_ends_at = created_at + interval '14 days' WHERE trial_ends_at IS NULL;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_status text;
```

## 6. (Opcional) Activar Customer Portal en Stripe
- Dashboard > Settings > Billing > Customer portal
- Permite a usuarios gestionar su suscripcion (cancelar, cambiar tarjeta)
- Ya hay endpoint listo: `POST /api/stripe/portal`
