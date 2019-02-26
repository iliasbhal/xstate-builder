import sub from './sub'

export const greet = (name: string): string => `Hello, ${sub.exaggerate(name, 8)}`

