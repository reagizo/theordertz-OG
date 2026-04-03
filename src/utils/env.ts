// Environment helpers for toggling local/manual vs Netlify-style flows
export const isLocalDeployment = (): boolean => {
  const value = process.env.LOCAL_DEV
  if (value === undefined) return true
  return value.toLowerCase() === 'true' || value === '1'
}

export default { isLocalDeployment }
