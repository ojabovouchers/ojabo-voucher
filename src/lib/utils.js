export function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const prefix = localStorage.getItem('voucher_prefix') || 'CATH'
  return `${prefix}-${seg()}-${seg()}`
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return 'Sem validade'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return phone
}

export function whatsappLink(phone, message) {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
