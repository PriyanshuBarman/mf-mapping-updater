import db from "../config/db.config.js";
import axios from "axios";
import pLimit from "p-limit";
import { getNavNDaysAgo } from "./utils/getNavNDaysAge.js";
import { calculateCAGR } from "./utils/calculateCAGR.js";

async function updateNavAndReturns() {
  const allFunds = await db.mutual_fund.findMany({
    select: {
      id: true,
      scheme_code: true,
    },
  });

  const failedFunds = [];
  const limit = pLimit(4);

  const updatePromises = allFunds.map(({ id, scheme_code }) =>
    limit(async () => {
      try {
        const { data } = await axios.get(
          `https://api.mfapi.in/mf/${scheme_code}`
        );
        const navData = data?.data;

        if (!Array.isArray(navData) || navData.length < 2) {
          console.warn(`⚠️ Skipping ${scheme_code}: insufficient NAV data`);
          failedFunds.push({ scheme_code, reason: "Insufficient NAV data" });
          return {
            success: false,
            scheme_code,
            error: "Insufficient NAV data",
          };
        }

        const latest_nav = navData[0].nav;
        const previous_nav = navData[1].nav;

        // ✅ Calculate returns using utility functions
        const nav1mData = getNavNDaysAgo(navData, 31);
        const return_1m = nav1mData
          ? ((latest_nav - nav1mData.nav) / nav1mData.nav) * 100
          : null;

        const nav6mData = getNavNDaysAgo(navData, 183);
        const return_6m = nav6mData
          ? ((latest_nav - nav6mData.nav) / nav6mData.nav) * 100
          : null;

        const nav1yData = getNavNDaysAgo(navData, 366);
        const return_1y = nav1yData
          ? calculateCAGR(nav1yData.nav, latest_nav, 1)
          : null;

        const nav3yData = getNavNDaysAgo(navData, 366 * 3);
        const return_3y = nav3yData
          ? calculateCAGR(nav3yData.nav, latest_nav, 3)
          : null;

        const nav5yData = getNavNDaysAgo(navData, 366 * 5);
        const return_5y = nav5yData
          ? calculateCAGR(nav5yData.nav, latest_nav, 5)
          : null;

        // Inception
        const [day, month, year] = navData[navData.length - 1].date.split("-");
        const inceptionDate = new Date(
          `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        );
        const yearsSinceInception =
          (new Date() - inceptionDate) / (1000 * 60 * 60 * 24 * 365.25);
        const nav_start = navData[navData.length - 1].nav;
        const return_inception = calculateCAGR(
          nav_start,
          latest_nav,
          yearsSinceInception
        );

        // ✅ Create returns object
        const returnsObject = {
          month_1: return_1m ? parseFloat(return_1m.toFixed(2)) : null,
          month_6: return_6m ? parseFloat(return_6m.toFixed(2)) : null,
          year_1: return_1y ? parseFloat(return_1y.toFixed(2)) : null,
          year_3: return_3y ? parseFloat(return_3y.toFixed(2)) : null,
          year_5: return_5y ? parseFloat(return_5y.toFixed(2)) : null,
          inception: return_inception
            ? parseFloat(return_inception.toFixed(2))
            : null,
          date: new Date().toISOString().split("T")[0],
        };

        // ✅ Create nav objects
        const navObject = {
          nav: latest_nav,
          date: navData[0].date,
        };
        const lastNavObject = {
          nav: previous_nav,
          date: navData[1].date,
        };

        // ✅ Update the database
        await db.mutual_fund.update({
          where: { id },
          data: {
            nav: navObject,
            last_nav: lastNavObject,
            returns: returnsObject,
            nav_updated_at: new Date(),
          },
        });

        console.log(`✅ Updated fund ${scheme_code} (ID: ${id})`);
        return { success: true, scheme_code, id };
      } catch (err) {
        failedFunds.push({ scheme_code, id, reason: err.message });
        console.error(
          `❌ Failed to update fund ${scheme_code} (ID: ${id}):`,
          err.message
        );
        return { success: false, scheme_code, id, error: err.message };
      }
    })
  );

  await Promise.allSettled(updatePromises);

  await db.$disconnect();

  if (failedFunds.length) {
    console.log(`❌ Failed: ${failedFunds.length} funds`);
    process.exit(1);
  } else {
    console.log(`✅ All funds updated successfully!`);
    process.exit(0);
  }
}

updateNavAndReturns();
