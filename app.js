const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const path = require("path");
const axios = require("axios");
const fs = require("fs");

// Replace this with your Anti-Captcha API Key
const API_KEY = "93a44d823e3a0ecd7dd42769dbc70db7";

async function solveCaptcha(captchaImage) {
  try {
    let captchaSrc = await captchaImage.getAttribute("src");
    let base64Data = captchaSrc.replace(
      /^data:image\/(png|jpeg|jpg);base64,/,
      ""
    );

    console.log("Sending CAPTCHA to Anti-Captcha...");

    let response = await axios.post("https://api.anti-captcha.com/createTask", {
      clientKey: API_KEY,
      task: {
        type: "ImageToTextTask",
        body: base64Data,
        phrase: false,
        case: false,
        numeric: false,
        math: false,
        minLength: 4,
        maxLength: 6,
      },
    });

    if (response.data.errorId > 0) {
      throw new Error(`Anti-Captcha Error: ${response.data.errorDescription}`);
    }

    let taskId = response.data.taskId;
    console.log("CAPTCHA submitted for solving. Task ID:", taskId);

    // Poll for result
    let solution;
    while (!solution) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      let result = await axios.post(
        "https://api.anti-captcha.com/getTaskResult",
        {
          clientKey: API_KEY,
          taskId: taskId,
        }
      );

      if (result.data.status === "ready") {
        solution = result.data.solution.text;
        console.log("CAPTCHA Solved:", solution);
      }
    }

    return solution;
  } catch (error) {
    console.error("Error solving CAPTCHA:", error);
    return null;
  }
}

async function run() {
  let options = new chrome.Options();

  let driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    await driver.get("https://pay.thaivisa-cbcssl.com/");

    // Wait for file input and upload the PDF
    const filePath = path.join(
      __dirname,
      "public",
      "Payment_DAC001250211-I-232620.pdf"
    );
    let fileInput = await driver.wait(
      until.elementLocated(By.xpath('//input[@type="file"]')),
      5000
    );
    await fileInput.sendKeys(filePath);

    // Wait for amount field and enter 4000
    let amountField = await driver.wait(
      until.elementLocated(By.id("reference_no")),
      5000
    );
    await amountField.clear();
    await amountField.sendKeys("4000");

    // Wait for the CAPTCHA image to load
    let captchaImage;
    try {
      captchaImage = await driver.wait(
        until.elementLocated(By.xpath("//img[contains(@src,'data:image')]")),
        10000
      );
    } catch (error) {
      console.error("CAPTCHA image not found. Retrying...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      captchaImage = await driver.wait(
        until.elementLocated(By.xpath("//img[contains(@src,'data:image')]")),
        10000
      );
    }

    // Solve the CAPTCHA
    let captchaSolution = await solveCaptcha(captchaImage);

    if (captchaSolution) {
      let captchaInput = await driver.findElement(By.id("captcha"));
      await captchaInput.sendKeys(captchaSolution);
    } else {
      console.log("Failed to solve CAPTCHA. Please try again.");
      return;
    }

    // Submit the form by clicking "Save & Continue"
    let submitButton = await driver.findElement(
      By.xpath('//button[contains(text(), "Save & Continue")]')
    );
    await submitButton.click();

    // ✅ Check if the URL changes (wait up to 20s)
    try {
      await driver.wait(async () => {
        return (
          (await driver.getCurrentUrl()) !== "https://pay.thaivisa-cbcssl.com/"
        );
      }, 20000);
      console.log("Redirected to:", await driver.getCurrentUrl());
    } catch (error) {
      console.log("No URL change detected. Checking for success message...");
    }

    // ✅ If no redirect, check for a success message
    try {
      await driver.wait(
        until.elementLocated(
          By.xpath("//*[contains(text(), 'Payment Successful')]")
        ),
        10000
      );
      console.log("Payment submitted successfully!");
    } catch (error) {
      console.error(
        "Payment submission may have failed. Please check manually."
      );
    }

    // ✅ Capture and Save the Redirected Page Source
    let pageSource = await driver.getPageSource();
    console.log("Page Source Retrieved!");

    // ✅ Save Page Source to a File
    const sourceFilePath = path.join(__dirname, "redirected_page_source.html");
    fs.writeFileSync(sourceFilePath, pageSource);
    console.log(`Redirected Page Source saved to: ${sourceFilePath}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await driver.quit();
  }
}

run();
