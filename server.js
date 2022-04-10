import express from "express"
import bodyParser from "body-parser"
import { lisoAssetsShare } from "./src/assets-share.js"

const app = express()

app.use(express.static("public"))

const jsonParser = bodyParser.json()
const urlencodedParser = bodyParser.urlencoded({
  extended: true
})

app.use(express.static("public"))
app.use(urlencodedParser)

app.set("view engine", "ejs")

app.get("/", (req, res) => {
  res.render("index", { text: "World" })
})

app.post("/", jsonParser, async (req, res) => {
  const share = await lisoAssetsShare(req.body["amountOrAddress"])
  // Share is equal with "Invalid" if the input is invalid
  res.send(JSON.stringify({share: share}))
})

app.listen(3000)