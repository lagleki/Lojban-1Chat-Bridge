import axios from "axios"

export type NSFWPredictions = { id: string; prob: number }[]

/** Classify remote image URL with nsfwjs (used when channel has nsfw_analysis enabled). */
export async function getNSFWString(
  file?: string,
): Promise<NSFWPredictions | null> {
  if (file === undefined) return null
  const tf = require("@tensorflow/tfjs-node")
  const nsfw = require("nsfwjs")
  const pic = await axios.get(file, {
    responseType: "arraybuffer",
  })
  const model = await nsfw.load()
  const image = await tf.node.decodeImage(pic.data, 3)
  let predictions: NSFWPredictions = await model.classify(image)
  predictions = predictions
    .filter((className: any) => {
      if (className.className === "Neutral") return
      if (className.probability > 0.6) return true
      return
    })
    .map((i: any) => {
      return { id: i.className, prob: Math.round(i.probability * 100) }
    })
  image.dispose()

  return predictions.length > 0 ? predictions : null
}
