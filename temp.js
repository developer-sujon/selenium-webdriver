const { Builder, By, Key, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// Function to introduce human-like typing delay
async function typeWithDelay(element, text, minDelay = 5, maxDelay = 20) {
  for (const char of text) {
    await element.sendKeys(char);
    await new Promise((resolve) =>
      setTimeout(
        resolve,
        Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
      )
    ); // Random delay between minDelay and maxDelay
  }
}

// Store form data dynamically
let timestamp = Date.now();
let formData = {
  company: `Tech Solutions ${timestamp}`,
  name: "John Doe",
  mobile: `017${Math.floor(10000000 + 3 * 9000000)}`,
  email: `johndoe${timestamp}@example.com`,
  address: "123 Business Street, Dhaka, Bangladesh",
  division: "Dhaka",
  district: "Gulshan",
  thana: "Savar",
  package: "P3 - 300",
  refName: "Reference Name",
  refMobile: `018${Math.floor(10000000 + 3 * 9000000)}`,
};

async function testNetFeeRegistration() {
  let options = new chrome.Options();
  options.setLoggingPrefs({ performance: "ALL" });

  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();
  try {
    // Open the registration page
    await driver.get("https://app.netfeebd.com/register");

    // Wait until the form is fully loaded
    await driver.wait(until.elementLocated(By.name("company")), 5000);

    // Fill out form fields with simulated typing delay
    for (let field in formData) {
      let fieldElement = await driver
        .findElement(By.name(field))
        .catch(() => null);
      if (fieldElement) {
        await typeWithDelay(fieldElement, formData[field]);
      }
    }

    // Handle dropdown selections
    await driver
      .findElement(By.id("division"))
      .sendKeys(formData.division, Key.RETURN);
    await driver
      .findElement(By.id("district"))
      .sendKeys(formData.district, Key.RETURN);
    await driver
      .findElement(By.id("thana"))
      .sendKeys(formData.thana, Key.RETURN);
    await driver
      .findElement(By.id("selector"))
      .sendKeys(formData.package, Key.RETURN);

    // Ensure no overlay is blocking the button
    try {
      let overlay = await driver
        .findElement(By.css(".overlay-class"))
        .catch(() => null);
      if (overlay) {
        await driver.wait(until.stalenessOf(overlay), 5000);
      }
    } catch (e) {
      console.log("No overlay found, proceeding...");
    }

    // Scroll into view before clicking the submit button
    let submitButton = await driver.findElement(By.css(".submitBtn"));
    await driver.executeScript(
      "arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});",
      submitButton
    );
    await driver.sleep(1000);

    // Ensure the button is visible and enabled before clicking
    await driver.wait(until.elementIsVisible(submitButton), 5000);
    await driver.wait(until.elementIsEnabled(submitButton), 5000);

    // Click using JavaScript if normal click fails
    try {
      await submitButton.click();
    } catch (e) {
      console.log("Normal click failed, using JavaScript click.");
      await driver.executeScript("arguments[0].click();", submitButton);
    }

    // Wait for network response
    await driver.sleep(3000);

    // Capture Network Responses
    let logs = await driver.manage().logs().get("performance");
    logs.forEach((log) => {
      let message = JSON.parse(log.message).message;
      if (message.method === "Network.responseReceived") {
        console.log(`🔹 Response from ${message.params.response.url}`);
        console.log(`  - Status: ${message.params.response.status}`);
        console.log(`  - Headers:`, message.params.response.headers);
      }
    });

    console.log("Registration form submitted successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await driver.quit();
  }
}

// Run the test
testNetFeeRegistration();
