import { analyzeWitnessStatement, checkBackendHealth, getGeneratedImageUrl } from './sceneApi.js'
import { generateSceneImage } from './sceneImage.js'

export async function analyzeSceneDescription(description) {
  return analyzeWitnessStatement(description)
}

export async function generateSceneIllustration(scene) {
  return generateSceneImage(scene)
}

export { checkBackendHealth, getGeneratedImageUrl }
