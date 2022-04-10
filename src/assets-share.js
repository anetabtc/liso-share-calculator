import fetch from "node-fetch"
import { bech32 } from "bech32"
import { GoogleSpreadsheet } from "google-spreadsheet"
import { LocalStorage } from "node-localstorage"
import cred from "../credentials.json" assert {type: "json"}
import config from "../config.json" assert {type: "json"}

let localStorage = new LocalStorage("./cache")
let invalid = "Invalid" //TODO Better error handling

// Checks if the input is an address, amount or "Invalid" than calculates the share.
export async function lisoAssetsShare(amountOrAddress) {
  let addressNetaAmount = 0
  const ergoFetch = await fetch(`https://api.ergoplatform.com/api/v1/addresses/${amountOrAddress}/balance/confirmed`);
  if(ergoFetch.status == 200) {
    let data = await ergoFetch.json()
    let tokens = data.tokens
    for(let i = 0; i < tokens.length; i++) {
      if(tokens[i].tokenId == config.neta_token_id) {
        addressNetaAmount = tokens[i].amount / (10 ** data.tokens[i].decimals)
      }
    }
    return calculateLisoAssetHoldingAmount(addressNetaAmount)
  }
  else if(!isNaN(amountOrAddress)) {
    return await calculateLisoAssetHoldingAmount(amountOrAddress)
  }
  else if(amountOrAddress.slice(0,4) == "addr") {
    let stakeAddress = await getStakeAddressIfExists(amountOrAddress)
    if(stakeAddress != invalid) {
      const cardanoFetch = await fetch(`https://cardano-mainnet.blockfrost.io/api/v0/accounts/${stakeAddress}/addresses/assets`,
        {
          method: "GET",
          headers: {
            "project_id": config.blockfrost_project_id
          }
        })
      if(cardanoFetch.status == 200) {
        let data = await cardanoFetch.json()
        for(let i = 0; i < data.length; i++) {
          if(data[i].unit == config.cneta_token_id) {
            addressNetaAmount = data[i].quantity
          }
        }
        return calculateLisoAssetHoldingAmount(addressNetaAmount)
      }
    }
    else {
      return invalid
    }
    
  }
  else {
    return invalid
  }
}

// Returns your share in the liso based on your holdings.
async function calculateLisoAssetHoldingAmount(amount) {
  const cachedLisoKey = "cachedLisoKey"
  if(getWithExpiry(cachedLisoKey) == null) {
    await setWithExpiry(cachedLisoKey, await getLisoTotalValue(), 12)
  }

  const totalNetaSupply = 2000000000
  const lisoTotalValue = getWithExpiry(cachedLisoKey)
  let yourShare = lisoTotalValue / totalNetaSupply * amount
  return yourShare
}

// Returns the stake address for cardano address, required for blockfrost api.
async function getStakeAddressIfExists(amountOrAddress) {
  try {
    const addressWords = await bech32.decode(amountOrAddress, 1000)
    const payload = await bech32.fromWords(addressWords.words)
    const addressDecoded = await `${Buffer.from(payload).toString("hex")}`
    const stakeAddressDecoded = await 'e1'+addressDecoded.substr(addressDecoded.length - 56);
    const stakeAddress = await bech32.encode(
      'stake',
      bech32.toWords(Uint8Array.from(Buffer.from(stakeAddressDecoded, "hex"))),
      1000
    )
    return stakeAddress
  }
  catch (e) {
    return invalid
  }
}

// Returns the total value of the liso, the value is cached for 12 hours.
async function getLisoTotalValue() {
  const doc = new GoogleSpreadsheet(config.google_spreadsheet_id)
  await doc.useServiceAccountAuth(cred)
  const info = await doc.loadInfo()
  const sheet = doc.sheetsByIndex[3]
  await sheet.loadCells('D2')
  let d2 = sheet.getCellByA1('D2')
  return d2.value
}

// Cache a value with a key for a given time
async function setWithExpiry(key, value, hours) {
  const now = new Date()
  let ttl = (now.getTime() + (hours * 60 * 60 * 1000))
  // `item` is an object which contains the original value
	// as well as the time when it's supposed to expire
  let item = {
    value: value,
    expiry: ttl,
  }
  localStorage.setItem(key, JSON.stringify(item))
}

// Returns the cached value by a key, if it is expired it gets deleted.
function getWithExpiry(key) {
	const itemStr = localStorage.getItem(key)
	// if the item doesn't exist, return null
	if (!itemStr) {
		return null
	}
	const item = JSON.parse(itemStr)
	const now = new Date()
	// compare the expiry time of the item with the current time
	if (now.getTime() > item.expiry) {
		// If the item is expired, delete the item from storage
		// and return null
		localStorage.removeItem(key)
		return null
	}
	return item.value
}