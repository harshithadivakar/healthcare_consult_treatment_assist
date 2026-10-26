export interface BslVideoReference {
  id: string
  title: string
  sourceUrl: string
  embedUrl: string
  collectionUrl: string
  creator: string
  licence: string
  licenceUrl: string
  scope: string
}

const collectionUrl = 'https://open.ed.ac.uk/british-sign-language-for-healthcare/'
const creator = 'Leah Fransisco for The University of Edinburgh'
const licence = 'CC BY 4.0'
const licenceUrl = 'https://creativecommons.org/licenses/by/4.0/'

export const bslVideoReferences: BslVideoReference[] = [
  {
    id: 'edinburgh-general-assessment',
    title: 'Next of kin and general assessment questions',
    sourceUrl: 'https://media.ed.ac.uk/media/3.%2BNext%2Bof%2Bkin%2Band%2Bgeneral%2Bassessment%2Bquestions.%2BBritish%2Bsign%2Blanguage%2Bfor%2Bhealthcare./1_cpmz82mh',
    embedUrl: 'https://cdnapisec.kaltura.com/p/2010292/embedPlaykitJs/uiconf_id/55171522?config%5Bprovider%5D=%7B%22widgetId%22%3A%221_mszf2q59%22%7D&entry_id=1_cpmz82mh&iframeembed=true',
    collectionUrl,
    creator,
    licence,
    licenceUrl,
    scope: 'Educational BSL demonstrations for next of kin, communication preferences and general assessment questions.',
  },
  {
    id: 'edinburgh-pain-assessment',
    title: 'Pain assessment questions',
    sourceUrl: 'https://media.ed.ac.uk/media/4.%2BPain%2Bassessment%2Bquestions:%2BBritish%2BSign%2BLanguage%2Bfor%2Bhealthcare/1_iv9q2x7v',
    embedUrl: 'https://cdnapisec.kaltura.com/p/2010292/embedPlaykitJs/uiconf_id/55171522?config%5Bprovider%5D=%7B%22widgetId%22%3A%221_oa7xk4yc%22%7D&entry_id=1_iv9q2x7v&iframeembed=true',
    collectionUrl,
    creator,
    licence,
    licenceUrl,
    scope: 'Educational BSL demonstrations for pain location, intensity and characteristics.',
  },
  {
    id: 'edinburgh-food-allergies',
    title: 'Eating and Drinking, allergies and intolerances',
    sourceUrl: 'https://media.ed.ac.uk/media/6.%2BEating%2Band%2BDrinking,%2Ballergies%2Band%2Bintolerances:%2BBritish%2BSign%2BLanguage%2Bfor%2Bhealthcare/1_v9xy2bc0',
    embedUrl: 'https://cdnapisec.kaltura.com/p/2010292/embedPlaykitJs/uiconf_id/55171522?iframeembed=true&entry_id=1_v9xy2bc0&config%5Bprovider%5D=%7B%22widgetId%22%3A%221_3rs56eyv%22%7D',
    collectionUrl,
    creator,
    licence,
    licenceUrl,
    scope: 'Educational BSL demonstrations for drinks, hunger, food allergies, medication allergies and intolerances.',
  },
  {
    id: 'edinburgh-toileting-reproductive-health',
    title: 'Passing urine and menstruation',
    sourceUrl: 'https://media.ed.ac.uk/media/7a.%2BPassing%2Burine%2Band%2Bmenstration:%2BBritish%2BSign%2BLanguage%2Bin%2Bhealthcare/1_dfrgdtaz',
    embedUrl: 'https://cdnapisec.kaltura.com/p/2010292/embedPlaykitJs/uiconf_id/55171522?iframeembed=true&entry_id=1_dfrgdtaz&config%5Bprovider%5D=%7B%22widgetId%22%3A%221_xkwo4koh%22%7D',
    collectionUrl,
    creator,
    licence,
    licenceUrl,
    scope: 'Educational BSL demonstrations for passing urine, menstruation and pregnancy questions.',
  },
]

export function getBslVideoReference(id?: string) {
  return bslVideoReferences.find((reference) => reference.id === id)
}

export function getBslClipEmbedUrl(reference: BslVideoReference, start: number, end: number) {
  const url = new URL(reference.embedUrl)
  url.searchParams.set('kalturaSeekFrom', String(start))
  url.searchParams.set('kalturaClipTo', String(end))
  return url.toString()
}

export function formatClipTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
