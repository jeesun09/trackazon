"use client";
import { scrapeAndStoreProduct } from "@/lib/actions/index";
import React, { FormEvent, useState } from "react";


const isValidAmazonProductURL = (url: string) => {
    try {
        const parsedURL = new URL(url);
        const hostname = parsedURL.hostname;

        if (
          hostname.includes("amazon.com") ||
          hostname.includes("amazon.") ||
          hostname.endsWith("amazon") ||
          hostname.includes("amzn.in")
        ) {
          return true;
        }

    } catch (error) {
        return false;
    }
    return false;;
}

const Searchbar = () => {
  const [searchPrompt, setSearchPromt] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async(event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const isValidLink = isValidAmazonProductURL(searchPrompt);
    if(!isValidLink){
        return alert('Please Provide Valid Amazon product URL');
    }
    try {
        setLoading(true);
        // Scrape the product page
        const product = await scrapeAndStoreProduct(searchPrompt)
    } catch (error) {
        console.log(error);
        setLoading(false);
    } finally{
        setLoading(false);
    }
  };

  return (
    <form className="flex flex-wrap gap-4 mt-12" onSubmit={handleSubmit}>
      <input
        type="text"
        value={searchPrompt}
        onChange={(e) => setSearchPromt(e.target.value)}
        placeholder="Enter product link"
        className="searchbar-input"
      />
      <button type="submit" className="searchbar-btn">
        { loading ? 'Searching...' : 'Search'}  
      </button>
    </form>
  );
};

export default Searchbar;
