"use server";

import { revalidatePath } from "next/cache";

import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import { scrapeAmazonProduct } from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { generateEmailBody, sendEmail } from "../nodemailer";

export async function scrapeAndStoreProduct(productUrl) {
  if (!productUrl) {
    console.error("Product URL is missing");
    return;
  }

  try {
    connectToDB();
    const scrapeProduct = await scrapeAmazonProduct(productUrl);

    if (!scrapeProduct) {
      console.error("Failed to scrape product data");
      return;
    }

    let product = scrapeProduct;
    const existingProduct = await Product.findOne({
      url: scrapeProduct.url,
    });

    if (existingProduct) {
      const updatedPriceHistory = [
        ...existingProduct.priceHistory,
        { price: scrapeProduct.currentPrice },
      ];

      product = {
        ...scrapeProduct,
        priceHistory: updatedPriceHistory,
        lowestPrice: getLowestPrice(updatedPriceHistory),
        highestPrice: getHighestPrice(updatedPriceHistory),
        averagePrice: getAveragePrice(updatedPriceHistory),
      };
    }

    const newProduct = await Product.findOneAndUpdate(
      { url: scrapeProduct.url },
      product,
      { upsert: true, new: true }
    );

    if (!newProduct) {
      throw new Error("Failed to create/update product");
    }

    revalidatePath(`/products/${newProduct._id}`);
  } catch (error) {
    throw new Error(`Failed to create/update product: ${error.message}`);
  }
}

export async function getProductId(productId) {
  try {
    connectToDB();

    const product = await Product.findOne({ _id: productId });

    if (!product) return null;

    return product;
  } catch (error) {
    console.log(`Failed to get product: ${error.message}`);
  }
}

export async function getAllProducts() {
  try {
    connectToDB();

    const products = await Product.find();

    return products;
  } catch (error) {
    console.log(`Failed to get products: ${error.message}`);
  }
}

export async function getSimilarProduct(productId) {
  try {
    connectToDB();

    const currentProduct = await Product.findById(productId);

    if (!currentProduct) return null;
    const similerProduct = await Product.find({
      _id: { $ne: productId },
    }).limit(3);

    return similerProduct;
  } catch (error) {
    console.log(`Failed to get products: ${error.message}`);
  }
}

export async function addUserEmailToProduct(productId, userEmail) {
  try {
    //send email
    const product = await Product.findById(productId);

    if (!product) {
      console.log(`Product not found`);
      return;
    }

    const userExist = product.users.some((user) => user.email === userEmail);

    if (!userExist) {
      product.users.push({ email: userEmail });

      await product.save();

      const emailContent = await generateEmailBody(product, "WELCOME");
      console.log(`Email content: ${emailContent}`);

      await sendEmail(emailContent, [userEmail]);
    }
  } catch (error) {
    console.log(`Failed to add email to product: ${error.message}`);
  }
}