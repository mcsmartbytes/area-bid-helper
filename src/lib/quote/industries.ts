import type { ServiceTemplate } from './types'

type IndustryDefinition = {
  id: string
  name: string
  description: string
  hero: string
  templates: ServiceTemplate[]
}

export const industryOptions: IndustryDefinition[] = [
  {
    id: 'asphalt',
    name: 'Asphalt & Sealcoating',
    hero: 'Sealcoat lots, stripe, and crack fill in minutes.',
    description: 'Parking lots, drive lanes, sealcoating, striping, crack repair.',
    templates: [
      { id: 'sealcoating', name: 'Sealcoating', measurementType: 'AREA', unitLabel: 'sqft', defaultRate: 0.18, minimumCharge: 450 },
      { id: 'crack-filling', name: 'Crack Filling', measurementType: 'LENGTH', unitLabel: 'ft', defaultRate: 0.6, minimumCharge: 250 },
      { id: 'striping', name: 'Line Striping', measurementType: 'LENGTH', unitLabel: 'ft', defaultRate: 1.1, minimumCharge: 225 },
    ],
  },
  {
    id: 'concrete',
    name: 'Concrete & Flatwork',
    hero: 'Measure pours, sidewalks, and curbs with satellite accuracy.',
    description: 'Flatwork pours, curb & gutter, sidewalk removal/replacement.',
    templates: [
      { id: 'flatwork', name: 'Concrete Flatwork', measurementType: 'AREA', unitLabel: 'sqft', defaultRate: 6.5, minimumCharge: 1200 },
      { id: 'sidewalk', name: 'Sidewalk Replace', measurementType: 'AREA', unitLabel: 'sqft', defaultRate: 4.75, minimumCharge: 900 },
      { id: 'curb', name: 'Curb & Gutter', measurementType: 'LENGTH', unitLabel: 'ft', defaultRate: 18, minimumCharge: 800 },
    ],
  },
  {
    id: 'landscape',
    name: 'Landscaping & Grounds',
    hero: 'Bid mowing, mulch, and bed edging without site visits.',
    description: 'Mowing acreage, mulch installs, edging, seasonal cleanups.',
    templates: [
      { id: 'mowing', name: 'Mowing', measurementType: 'AREA', unitLabel: 'sqft', defaultRate: 0.06, minimumCharge: 150 },
      { id: 'mulch', name: 'Mulch Install', measurementType: 'AREA', unitLabel: 'sqft', defaultRate: 0.25, minimumCharge: 250 },
      { id: 'edging', name: 'Bed Edging', measurementType: 'LENGTH', unitLabel: 'ft', defaultRate: 1.5, minimumCharge: 200 },
    ],
  },
]

export function getIndustryTemplates(industryId?: string): ServiceTemplate[] {
  if (!industryId) {
    return industryOptions[0]?.templates ?? []
  }
  const match = industryOptions.find((option) => option.id === industryId)
  return match?.templates ?? industryOptions[0]?.templates ?? []
}
