import Product from "@/lib/models/product.model";
import { connectToDB } from "@/lib/mongoose";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";
import { scrapeAmazonProduct } from "@/lib/scraper";
import { getAveragePrice, getEmailNotifType, getHighestPrice, getLowestPrice } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    connectToDB();

    const products = await Product.find({});
    if (!products) throw new Error("No products found");

    // cron job logic : 1. Scrape Latest Product Details and Update in DB
    const updatedProducts = await Promise.all(
      products.map(async (currentProduct) => {
        const scrapeProduct = await scrapeAmazonProduct(currentProduct.url);

        if (!scrapeProduct) throw new Error("No product found");

        const updatedPriceHistory = [
          ...currentProduct.priceHistory,
          { price: scrapeProduct.currentPrice },
        ];
        const product = {
            ...scrapeProduct,
            priceHistory: updatedPriceHistory,
            lowestPrice: getLowestPrice(updatedPriceHistory),
            highestPrice: getHighestPrice(updatedPriceHistory),
            averagePrice: getAveragePrice(updatedPriceHistory),
        };
        const updatedProduct = await Product.findOneAndUpdate(
            { url: scrapeProduct.url },
            product
        );

        //2. Check each product's status and send email accrordingly
        const emailNotifType = getEmailNotifType(scrapeProduct, currentProduct);
        if (emailNotifType && updatedProduct.users.length > 0) {
            const productInfo = {
                title:  updatedProduct.title,
                url: updatedProduct.url,
            }
            const emailContent = await generateEmailBody(productInfo, emailNotifType);

            const userEmails = updatedProduct.users.map((user: any) => user.email);

            await sendEmail(emailContent, userEmails);
        }

        return updatedProduct;
      })
    );

    return NextResponse.json({
        message: 'Ok',
        data: updatedProducts
    })
  } catch (error: any) {
    throw new Error(`Error in GET: ${error.message}`);
  }
}
