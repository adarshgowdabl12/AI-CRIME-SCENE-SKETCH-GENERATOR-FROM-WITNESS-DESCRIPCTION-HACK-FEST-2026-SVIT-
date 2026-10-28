const STORAGE_KEY = 'trace-ai-scenes-v1'

export function getSavedScenes() {
  try {
    const scenes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(scenes) ? scenes : []
  } catch {
    return []
  }
}

export function saveScene(scene) {
  const scenes = getSavedScenes().filter((saved) => saved.id !== scene.id)
  const next = [{ ...scene, savedAt: new Date().toISOString() }, ...scenes]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function deleteScene(sceneId) {
  const next = getSavedScenes().filter((scene) => scene.id !== sceneId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}