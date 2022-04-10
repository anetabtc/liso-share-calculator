window.onload = init
function init() {
let submitBtn = document.getElementById("submit-btn")
if(submitBtn) {
  
  submitBtn.addEventListener("click",(e) => {
    let value = document.getElementById("input-field")
    let payload = JSON.stringify({amountOrAddress: value.value})
    e.preventDefault()
    // Fetch the share from the backend
    fetch("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: payload
    }).then(resp => resp.json())
    .then(respJson => {
      if(respJson["share"] == "Invalid") {
        alert("Invalid address or amount!")
      }
      else {
        let share = document.getElementById("share")
        share.textContent = "Your LISO share: " + respJson["share"]
      }
    })
    .catch(e => alert("Something went wrong: " + e)) //Unknown error
  })
}
}
