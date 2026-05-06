const SHEET_NAMES = {
  CATALOG: "Catalog",
  STAFF: "Staff",
  CUSTOMERS: "Customers",
  ORDERS: "Orders",
  PRODUCT_INTAKE: "Product_Intake",
};

const DEFAULT_HEADERS = {
  Catalog: ["Code", "Barcode", "Name_Ar", "Name_En", "Price", "Stock", "Category_Name", "Category_Name_En"],
  Staff: ["Username", "Phone", "Full_Name", "Password_Hash", "Email", "Role", "Status", "Created_At"],
  Customers: ["Phone", "Username", "Full_Name", "Password_Hash", "Email", "Address", "Status", "OTP", "OTP_Expiry", "Created_At"],
  Orders: [
    "Order_ID",
    "Customer_Phone",
    "Customer_Name",
    "Product_Codes",
    "Items",
    "Item_Count",
    "Subtotal",
    "Tax",
    "Delivery_Fee",
    "Total_Price",
    "Address",
    "City",
    "Street",
    "Note",
    "Payment_Method",
    "Payment_Label",
    "POS_Requested",
    "Delivery_Window",
    "Validation_Status",
    "Workflow_Lane",
    "Workflow_Priority",
    "Workflow_Score",
    "Order_Channel",
    "Order_Date",
    "Status",
  ],
  Product_Intake: [
    "Entry_ID",
    "Barcode",
    "Product_Name",
    "Cost_Price",
    "Selling_Price",
    "Discount_Percent",
    "Quantity",
    "Stock_Alert",
    "Image_File_ID",
    "Image_Url",
    "Captured_At",
    "Captured_By",
    "Status",
    "Created_At",
  ],
};

const EGYPTIAN_PHONE_REGEX = /^01[0125][0-9]{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_REGEX = /^\d{6}$/;
const OTP_EXPIRY_MINUTES = 10;
const SESSION_DURATION_HOURS = 24;
const SESSION_PROPERTY_PREFIX = "AUTH_SESSION:";
const CATALOG_RESET_PROPERTY = "CATALOG_RESET_VERSION";
const CATALOG_RESET_VERSION = "2026-04-empty-catalog-v1";
const CATALOG_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRioq-Q9nxt-iM02Q-YM97_JHey29jt6C6go4FLJoSZbFQ2CY2hVrwmdC__tF7Cul91auH8L0ARutCQ/pub?gid=25643091&single=true&output=csv";
const PRODUCT_INTAKE_STATUS = "Pending Review";
const PRODUCT_INTAKE_FOLDER_NAME = "United Pharmacies Product Intake";
const PRODUCT_INTAKE_FOLDER_ID_PROPERTY = "PRODUCT_INTAKE_DRIVE_FOLDER_ID";
const PRODUCT_LOOKUP_USER_AGENT = "United Pharmacies Admin/1.0 (barcode lookup)";
const BARCODE_LOOKUP_REGEX = /^\d{8,14}$/;
const MOJIBAKE_TEXT_PATTERN_ = /[ÃƒÃ‚Ã˜Ã™Â£Ã¢]/;
const WINDOWS_1252_ENCODE_MAP_ = {
  8364: 128,
  8218: 130,
  402: 131,
  8222: 132,
  8230: 133,
  8224: 134,
  8225: 135,
  710: 136,
  8240: 137,
  352: 138,
  8249: 139,
  338: 140,
  381: 142,
  8216: 145,
  8217: 146,
  8220: 147,
  8221: 148,
  8226: 149,
  8211: 150,
  8212: 151,
  732: 152,
  8482: 153,
  353: 154,
  8250: 155,
  339: 156,
  382: 158,
  376: 159,
};

function doGet(e) {
  try {
    var action = normalizeText_(e && e.parameter && e.parameter.action);

    if (action === "login") {
      return jsonResponse_(
        login_({
          usernameOrPhone: e.parameter.usernameOrPhone,
          password: e.parameter.password,
          role: e.parameter.role,
        }),
      );
    }

    if (action === "get_catalog") {
      return jsonResponse_(getCatalog_());
    }

    if (action === "get_dashboard_stats") {
      return jsonResponse_(getDashboardStats_(e.parameter));
    }

    if (action === "get_orders_admin") {
      return jsonResponse_(getOrdersAdmin_(e.parameter));
    }

    if (action === "get_customer_orders") {
      return jsonResponse_(getCustomerOrders_(e.parameter));
    }

    if (action === "get_staff") {
      return jsonResponse_(getStaff_(e.parameter));
    }

    if (action === "lookup_barcode") {
      return jsonResponse_(lookupBarcode_({
        barcode: e.parameter.barcode || e.parameter.Barcode,
        Session_Token: e.parameter.Session_Token || e.parameter.sessionToken,
      }));
    }

    if (
      action === "search"
      || action === "search_suggestions"
      || (!action && normalizeText_(e.parameter.q || e.parameter.query || ""))
    ) {
      return jsonResponse_({
        results: getSearchSuggestions_({
          q: e.parameter.q,
          lang: e.parameter.lang,
        }),
      });
    }

    return jsonResponse_(failure_("Unsupported GET action."));
  } catch (error) {
    return jsonResponse_(failure_(error instanceof Error ? error.message : "Unexpected server error."));
  }
}

function doPost(e) {
  try {
    var body = parsePostBody_(e);
    var action = getPostAction_(e, body);
    var data = getPostData_(body);

    if (action === "login") {
      return jsonResponse_(login_(data));
    }

    return jsonResponse_(
      withScriptLock_(function () {
        if (action === "register" || action === "register_customer") {
          return registerCustomer_(data);
        }

        if (action === "verify_otp") {
          return verifyOtp_(data);
        }

        if (action === "resend_otp") {
          return resendOtp_(data);
        }

        if (action === "update_customer_profile") {
          return updateCustomerProfile_(data);
        }

        if (action === "logout") {
          return logout_(data);
        }

        if (action === "create_order") {
          return createOrder_(data);
        }

        if (action === "update_order_status") {
          return updateOrderStatus_(data);
        }

        if (action === "add_product") {
          return addProduct_(data);
        }

        if (action === "submit_fast_entry_product") {
          return submitFastEntryProduct_(data);
        }

        if (action === "update_product") {
          return updateProduct_(data);
        }

        if (action === "delete_product") {
          return deleteProduct_(data);
        }

        if (action === "add_staff") {
          return addStaff_(data);
        }

        if (action === "update_staff_status") {
          return updateStaffStatus_(data);
        }

        return failure_("Unsupported POST action.");
      }),
    );
  } catch (error) {
    return jsonResponse_(failure_(error instanceof Error ? error.message : "Unexpected server error."));
  }
}

function setupSheets() {
  ensureCatalogSheetWithHeaders_();
  ensureSheetWithHeaders_(SHEET_NAMES.STAFF, DEFAULT_HEADERS.Staff);
  ensureSheetWithHeaders_(SHEET_NAMES.CUSTOMERS, DEFAULT_HEADERS.Customers);
  ensureSheetWithHeaders_(SHEET_NAMES.ORDERS, DEFAULT_HEADERS.Orders);
  ensureSheetWithHeaders_(SHEET_NAMES.PRODUCT_INTAKE, DEFAULT_HEADERS.Product_Intake);
}

function HASH_PASSWORD(value) {
  return sha256_(String(value || ""));
}

/* ------------------------------------------------------------------ */
/*  Core API functions (unchanged except for helper integrations)     */
/* ------------------------------------------------------------------ */

function login_(payload) {
  var usernameOrPhone = String(payload.usernameOrPhone || "").trim();
  var password = String(payload.password || "");
  var role = normalizeText_(payload.role);

  if (!usernameOrPhone || !password) {
    return failure_("usernameOrPhone and password are required.");
  }

  if (role !== "staff" && role !== "customer") {
    return failure_("role must be either staff or customer.");
  }

  var passwordHash = sha256_(password);
  var snapshot = role === "staff"
    ? getSheetSnapshot_(SHEET_NAMES.STAFF, DEFAULT_HEADERS.Staff)
    : getSheetSnapshot_(SHEET_NAMES.CUSTOMERS, DEFAULT_HEADERS.Customers);
  var record = findUserRecord_(snapshot.records, usernameOrPhone);

  if (!record || !passwordMatches_(record, password, passwordHash)) {
    return failure_("Invalid usernameOrPhone or password.");
  }

  if (role === "customer") {
    var customerStatus = normalizeCustomerStatus_(getField_(record, ["status"])) || "Pending";

    if (customerStatus === "Pending") {
      return failure_("Please verify the OTP sent to your email before signing in.");
    }

    if (customerStatus !== "Active") {
      return failure_("Your customer account is not active.");
    }
  }

  var appRole = role === "staff" ? "admin" : "customer";
  var session = createSession_(record, appRole);

  return success_(
    buildUserResponse_(record, appRole, session),
    role === "staff" ? "Staff login successful." : "Customer login successful.",
  );
}

function registerCustomer_(payload) {
  var phone = String(payload.Phone || "").trim();
  var username = String(payload.Username || "").trim();
  var fullName = String(payload.Full_Name || "").trim();
  var password = String(payload.Password || "");
  var email = String(payload.Email || "").trim().toLowerCase();
  var address = String(payload.Address || "").trim();
  var normalizedPhone = normalizePhone_(phone);

  if (!phone || !fullName || !email || !address || !password) {
    return failure_("Phone, Full_Name, Email, Address, and Password are required.");
  }

  if (!EGYPTIAN_PHONE_REGEX.test(normalizedPhone)) {
    return failure_("Phone must match the Egyptian mobile format (01XXXXXXXXX).");
  }

  if (!EMAIL_REGEX.test(email)) {
    return failure_("Please enter a valid email address.");
  }

  if (password.length < 6) {
    return failure_("Password must be at least 6 characters.");
  }

  var customerLookup = getCustomerLookup_();
  var existingCustomer = findCustomerByPhoneInLookup_(customerLookup, normalizedPhone);

  if (existingCustomer) {
    return failure_("A customer with this phone number already exists.");
  }

  if (username) {
    var snapshot = getSheetSnapshot_(SHEET_NAMES.CUSTOMERS, DEFAULT_HEADERS.Customers);
    var usernameAlreadyUsed = snapshot.records.some(function (record) {
      return normalizeText_(getField_(record, ["username"])) === normalizeText_(username);
    });

    if (usernameAlreadyUsed) {
      return failure_("This username is already taken.");
    }
  }

  var otp = createOtpCode_();
  var otpExpiry = createOtpExpiryDate_().toISOString();
  var createdAt = new Date().toISOString();
  var rowValues = buildRowForSheet_(customerLookup.headers, {
    Phone: normalizedPhone,
    Username: username,
    Full_Name: fullName,
    Password_Hash: sha256_(password),
    Email: email,
    Address: address,
    Status: "Pending",
    OTP: otp,
    OTP_Expiry: otpExpiry,
    Created_At: createdAt,
  });

  customerLookup.sheet.appendRow(rowValues);
  var insertedRowNumber = customerLookup.sheet.getLastRow();

  try {
    sendCustomerOtpEmail_(email, fullName, otp);
  } catch (error) {
    customerLookup.sheet.deleteRow(insertedRowNumber);
    var errorMessage = error && error.message ? error.message : String(error || "Unknown error");
    Logger.log("GmailApp.sendEmail failed: " + errorMessage);
    throw new Error("Unable to send the verification code. Please try again. " + errorMessage);
  }

  return success_(
    {
      phone: normalizedPhone,
      email: email,
      fullName: fullName,
      username: username,
      status: "Pending",
      verificationRequired: true,
      created_at: createdAt,
    },
    "Verification code sent successfully.",
  );
}

function verifyOtp_(payload) {
  var phone = String(payload.Phone || payload.phone || "").trim();
  var otp = String(payload.OTP || payload.otp || "").trim();
  var normalizedPhone = normalizePhone_(phone);

  if (!EGYPTIAN_PHONE_REGEX.test(normalizedPhone)) {
    return failure_("Phone must match the Egyptian mobile format (01XXXXXXXXX).");
  }

  if (!OTP_REGEX.test(otp)) {
    return failure_("OTP must be a 6-digit code.");
  }

  var customerLookup = getCustomerLookup_();
  var match = findCustomerByPhoneInLookup_(customerLookup, normalizedPhone);

  if (!match) {
    return failure_("No customer was found for this phone number.");
  }

  var record = match.record;
  var status = normalizeCustomerStatus_(getField_(record, ["status"])) || "Pending";

  if (status === "Active") {
    return failure_("This account is already verified.");
  }

  if (status !== "Pending") {
    return failure_("This account is not eligible for OTP verification.");
  }

  var storedOtp = String(getField_(record, ["otp"]) || "").trim();
  var otpExpiryValue = getField_(record, ["otp_expiry", "otpexpiry"]);
  var otpExpiry = parseDateValue_(otpExpiryValue);

  if (!storedOtp) {
    return failure_("No active verification code was found. Please request a new OTP.");
  }

  if (!otpExpiry || otpExpiry.getTime() < Date.now()) {
    clearCustomerOtpFields_(customerLookup, match);
    return failure_("This verification code has expired. Please request a new OTP.");
  }

  if (String(storedOtp) !== String(otp)) {
    return failure_("The verification code you entered is incorrect.");
  }

  var updatedRow = buildMergedRowForSheet_(customerLookup.headers, record, {
    Status: "Active",
    OTP: "",
    OTP_Expiry: "",
  });

  customerLookup.sheet
    .getRange(record.rowNumber, 1, 1, customerLookup.headers.length)
    .setValues([updatedRow]);

  record.normalized[normalizeKey_("Status")] = "Active";
  record.normalized[normalizeKey_("OTP")] = "";
  record.normalized[normalizeKey_("OTP_Expiry")] = "";
  var session = createSession_(record, "customer");

  return success_(
    buildUserResponse_(record, "customer", session),
    "Account verified successfully.",
  );
}

function resendOtp_(payload) {
  var phone = String(payload.Phone || payload.phone || "").trim();
  var normalizedPhone = normalizePhone_(phone);

  if (!EGYPTIAN_PHONE_REGEX.test(normalizedPhone)) {
    return failure_("Phone must match the Egyptian mobile format (01XXXXXXXXX).");
  }

  var customerLookup = getCustomerLookup_();
  var match = findCustomerByPhoneInLookup_(customerLookup, normalizedPhone);

  if (!match) {
    return failure_("No customer was found for this phone number.");
  }

  var record = match.record;
  var status = normalizeCustomerStatus_(getField_(record, ["status"])) || "Pending";

  if (status === "Active") {
    return failure_("This account is already verified.");
  }

  if (status !== "Pending") {
    return failure_("This account is not eligible for OTP verification.");
  }

  var email = String(getField_(record, ["email"]) || "").trim().toLowerCase();
  var fullName = String(getField_(record, ["full_name", "fullname", "name"]) || "").trim();

  if (!email) {
    return failure_("No email address is available for this account.");
  }

  var otp = createOtpCode_();
  var otpExpiry = createOtpExpiryDate_().toISOString();
  var updatedRow = buildMergedRowForSheet_(customerLookup.headers, record, {
    OTP: otp,
    OTP_Expiry: otpExpiry,
    Status: "Pending",
  });

  customerLookup.sheet
    .getRange(match.sheetRow, 1, 1, customerLookup.headers.length)
    .setValues([updatedRow]);

  try {
    sendCustomerOtpEmail_(email, fullName, otp);
  } catch (error) {
    var errorMessage = error && error.message ? error.message : String(error || "Unknown error");
    Logger.log("Resend OTP email failed: " + errorMessage);
    throw new Error("Unable to resend the verification code. Please try again. " + errorMessage);
  }

  return success_(
    {
      phone: normalizedPhone,
      email: email,
      fullName: fullName,
      status: "Pending",
      verificationRequired: true,
      created_at: String(getField_(record, ["created_at", "createdat"]) || ""),
    },
    "A new verification code has been sent to your email.",
  );
}

function updateCustomerProfile_(payload) {
  var auth = ensureAuthorizedSession_(payload);

  if (auth.success === false) {
    return auth;
  }

  var fullName = normalizeInputText_(payload.Full_Name || getField_(auth.record, ["full_name", "fullname", "name"]));
  var phone = normalizePhone_(payload.Phone || getField_(auth.record, ["phone"]));
  var email = String(payload.Email || getField_(auth.record, ["email"]) || "").trim().toLowerCase();
  var address = normalizeInputText_(payload.Address || getField_(auth.record, ["address"]));
  var currentPassword = String(payload.Current_Password || payload.currentPassword || "");
  var newPassword = String(payload.New_Password || payload.newPassword || "");

  if (!fullName || !phone || !email) {
    return failure_("Full_Name, Phone, and Email are required.");
  }

  if (!EGYPTIAN_PHONE_REGEX.test(phone)) {
    return failure_("Phone must match the Egyptian mobile format (01XXXXXXXXX).");
  }

  if (!EMAIL_REGEX.test(email)) {
    return failure_("Please enter a valid email address.");
  }

  if (auth.role === "customer" && !address) {
    return failure_("Address is required.");
  }

  if (newPassword && newPassword.length < 6) {
    return failure_("New password must be at least 6 characters.");
  }

  if (newPassword && !currentPassword) {
    return failure_("Current password is required to set a new password.");
  }

  if (
    newPassword &&
    !passwordMatches_(auth.record, currentPassword, sha256_(currentPassword))
  ) {
    return failure_("The current password you entered is incorrect.");
  }

  var duplicatePhone = auth.snapshot.records.some(function (candidate) {
    return (
      candidate.rowNumber !== auth.record.rowNumber &&
      normalizePhone_(getField_(candidate, ["phone"])) === phone
    );
  });

  if (duplicatePhone) {
    return failure_("Another account already uses this phone number.");
  }

  var duplicateEmail = auth.snapshot.records.some(function (candidate) {
    return (
      candidate.rowNumber !== auth.record.rowNumber &&
      normalizeText_(getField_(candidate, ["email"])) === normalizeText_(email)
    );
  });

  if (duplicateEmail) {
    return failure_("Another account already uses this email address.");
  }

  var updates = {
    Full_Name: fullName,
    Phone: phone,
    Email: email,
  };

  if (auth.role === "customer") {
    updates.Address = address;
  }

  if (newPassword) {
    updates.Password_Hash = sha256_(newPassword);
  }

  var rowValues = buildMergedRowForSheet_(auth.snapshot.headers, auth.record, updates);

  auth.snapshot.sheet
    .getRange(auth.record.rowNumber, 1, 1, auth.snapshot.headers.length)
    .setValues([rowValues]);

  var updatedRecord = buildRecord_(auth.snapshot.headers, rowValues, auth.record.rowNumber);
  var session = refreshSession_(auth.session, updatedRecord, auth.role);

  return success_(
    buildUserResponse_(updatedRecord, auth.role, session),
    "Profile updated successfully.",
  );
}

function logout_(payload) {
  var sessionToken = getSessionTokenFromPayload_(payload);

  if (sessionToken) {
    deleteSession_(sessionToken);
  }

  return success_({ loggedOut: true }, "Signed out successfully.");
}

function createOrder_(payload) {
  var customerPhone = normalizePhone_(payload.Customer_Phone || "");
  var customerName = normalizeInputText_(payload.Customer_Name || "");
  var productCodes = String(payload.Product_Codes || "").trim();
  var items = parseOrderItemsPayload_(payload.Items);
  var itemCount = Math.max(0, Math.floor(parseNumber_(payload.Item_Count)));
  var subtotal = parseNumber_(payload.Subtotal);
  var tax = parseNumber_(payload.Tax);
  var deliveryFee = parseNumber_(payload.Delivery_Fee);
  var totalPrice = parseNumber_(payload.Total_Price);
  var address = normalizeInputText_(payload.Address || "");
  var city = normalizeInputText_(payload.City || "");
  var street = normalizeInputText_(payload.Street || "");
  var note = normalizeInputText_(payload.Note || "");
  var paymentMethod = normalizeOrderPaymentMethod_(payload.Payment_Method || payload.paymentMethod || "");
  var paymentLabel = normalizeInputText_(payload.Payment_Label || payload.paymentLabel || "");
  var requestPosMachine = parseBooleanValue_(payload.POS_Requested || payload.requestPosMachine);
  var deliveryWindow = normalizeInputText_(payload.Delivery_Window || "");
  var orderChannel = normalizeInputText_(payload.Order_Channel || "") || "website";
  var derivedItemCount = items.reduce(function (total, item) {
    return total + Math.max(1, Math.floor(item.quantity || 0));
  }, 0);
  var expectedTotal = Number((subtotal + tax + deliveryFee).toFixed(2));
  var workflow;

  if (!customerPhone || !customerName || !productCodes || !address || !city || !street || !deliveryWindow) {
    return failure_("Customer name, phone, address, city, street, product codes, and delivery window are required.");
  }

  if (!EGYPTIAN_PHONE_REGEX.test(customerPhone)) {
    return failure_("Customer_Phone must match the Egyptian mobile format (01XXXXXXXXX).");
  }

  if (customerName.length < 3) {
    return failure_("Customer_Name must contain at least 3 characters.");
  }

  if (city.length < 2 || street.length < 6 || address.length < 8) {
    return failure_("Address details are incomplete.");
  }

  if (!Number.isFinite(subtotal) || subtotal <= 0 || !Number.isFinite(tax) || tax < 0) {
    return failure_("Subtotal and Tax must be valid numbers.");
  }

  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
    return failure_("Delivery_Fee must be a valid non-negative number.");
  }

  if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
    return failure_("Total_Price must be a valid positive number.");
  }

  if (!paymentMethod) {
    return failure_("Payment_Method must be cod, instapay, vodafone, online, or banquemisr.");
  }

  if (!paymentLabel) {
    return failure_("Payment_Label is required.");
  }

  if (paymentMethod !== "cod" && requestPosMachine) {
    return failure_("POS_Requested is only allowed with cash on delivery.");
  }

  if (Math.abs(expectedTotal - totalPrice) > 0.51) {
    return failure_("Order totals are inconsistent.");
  }

  if (derivedItemCount <= 0) {
    return failure_("At least one valid order item is required.");
  }

  var snapshot = getSheetSnapshot_(SHEET_NAMES.ORDERS, DEFAULT_HEADERS.Orders);
  var orderDate = new Date();
  var orderDateIso = orderDate.toISOString();
  var orderId = createOrderId_(orderDate);
  var status = "Pending";
  workflow = buildOrderWorkflow_(items, {
    itemCount: itemCount || derivedItemCount,
    subtotal: subtotal,
    tax: tax,
    deliveryFee: deliveryFee,
    totalPrice: totalPrice,
    note: note,
    address: address,
    city: city,
    street: street,
  });
  var rowValues = buildRowForSheet_(snapshot.headers, {
    Order_ID: orderId,
    Customer_Phone: customerPhone,
    Customer_Name: customerName,
    Product_Codes: productCodes,
    Items: JSON.stringify(items),
    Item_Count: itemCount || derivedItemCount,
    Subtotal: Number(subtotal.toFixed(2)),
    Tax: Number(tax.toFixed(2)),
    Delivery_Fee: Number(deliveryFee.toFixed(2)),
    Total_Price: Number(totalPrice.toFixed(2)),
    Address: address,
    City: city,
    Street: street,
    Note: note,
    Payment_Method: paymentMethod,
    Payment_Label: paymentLabel,
    POS_Requested: requestPosMachine ? "true" : "false",
    Delivery_Window: deliveryWindow,
    Validation_Status: "Validated",
    Workflow_Lane: workflow.lane,
    Workflow_Priority: workflow.priority,
    Workflow_Score: workflow.score,
    Order_Channel: orderChannel,
    Order_Date: orderDateIso,
    Status: status,
  });

  snapshot.sheet.appendRow(rowValues);

  return success_(
    {
      orderId: orderId,
      orderDate: orderDateIso,
      status: status,
    },
    "Order created successfully.",
  );
}

function parseOrderItemsPayload_(value) {
  var rawItems = [];

  if (Array.isArray(value)) {
    rawItems = value;
  } else if (typeof value === "string" && value.trim()) {
    try {
      rawItems = JSON.parse(value);
    } catch (error) {
      throw new Error("Items payload must be valid JSON.");
    }
  }

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map(function (item) {
      if (!item || typeof item !== "object") {
        return null;
      }

      var productId = normalizeInputText_(item.productId || item.id || "");
      var name = normalizeInputText_(item.name || "");
      var quantity = Math.max(1, Math.floor(parseNumber_(item.quantity)));
      var price = Number(parseNumber_(item.price).toFixed(2));

      if (!productId || !name || !Number.isFinite(price) || price < 0) {
        return null;
      }

      return {
        productId: productId,
        name: name,
        quantity: quantity,
        price: price,
      };
    })
    .filter(Boolean);
}

function buildOrderWorkflow_(items, order) {
  var noteText = normalizeText_(order.note || "");
  var priorityScore = 0;
  var containsSensitiveKeywords = /(rx|prescription|doctor|وصفة|روشتة|حساس|urgent|عاجل)/i.test(noteText);

  if (order.totalPrice >= 700) {
    priorityScore += 28;
  } else if (order.totalPrice >= 350) {
    priorityScore += 18;
  } else {
    priorityScore += 8;
  }

  if (order.itemCount >= 5) {
    priorityScore += 20;
  } else if (order.itemCount >= 3) {
    priorityScore += 12;
  } else {
    priorityScore += 6;
  }

  if (items.some(function (item) { return item.quantity >= 3; })) {
    priorityScore += 10;
  }

  if (order.address.length >= 18 && order.street.length >= 6 && order.city.length >= 2) {
    priorityScore += 12;
  }

  if (noteText) {
    priorityScore += 8;
  }

  if (containsSensitiveKeywords) {
    priorityScore += 22;
  }

  if (priorityScore >= 68) {
    return {
      lane: "priority-review",
      priority: "high",
      score: priorityScore,
    };
  }

  if (priorityScore >= 42) {
    return {
      lane: "fast-track",
      priority: "medium",
      score: priorityScore,
    };
  }

  return {
    lane: "standard",
    priority: "normal",
    score: priorityScore,
  };
}

function getCatalog_() {
  var snapshot = getCatalogSnapshot_();
  var products = snapshot.records
    .filter(function (record) {
      return isMeaningfulRecord_(record, ["code", "name_ar", "name_en", "name"]);
    })
    .map(buildProductResponse_)
    .sort(function (left, right) {
      return String(left.nameAr || left.name || "").localeCompare(String(right.nameAr || right.name || ""), "ar");
    });

  return success_(
    {
      products: products,
      lastUpdated: new Date().toISOString(),
    },
    "Catalog loaded successfully.",
  );
}

function getDashboardStats_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var orderSnapshot = getSheetSnapshot_(SHEET_NAMES.ORDERS, DEFAULT_HEADERS.Orders);
  var customerSnapshot = getSheetSnapshot_(SHEET_NAMES.CUSTOMERS, DEFAULT_HEADERS.Customers);
  var catalogSnapshot = getCatalogSnapshot_();
  var totalSales = 0;
  var totalOrders = 0;
  var newCustomers = 0;
  var lowStockItems = 0;

  orderSnapshot.records.forEach(function (record) {
    if (!isMeaningfulRecord_(record, ["order_id", "customer_phone", "total_price"])) {
      return;
    }

    totalOrders += 1;
    totalSales += readNumberField_(record, ["total_price", "totalprice"]);
  });

  customerSnapshot.records.forEach(function (record) {
    if (isMeaningfulRecord_(record, ["phone", "full_name", "username"])) {
      newCustomers += 1;
    }
  });

  catalogSnapshot.records.forEach(function (record) {
    if (!isMeaningfulRecord_(record, ["code", "name"])) {
      return;
    }

    if (readNumberField_(record, ["stock"]) < 10) {
      lowStockItems += 1;
    }
  });

  return success_(
    {
      totalSales: Number(totalSales.toFixed(2)),
      totalOrders: totalOrders,
      newCustomers: newCustomers,
      lowStockItems: lowStockItems,
      ordersByDay: buildOrdersByDaySeries_(orderSnapshot.records, 7),
    },
    "Dashboard stats loaded successfully.",
  );
}

function getOrdersAdmin_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var snapshot = getSheetSnapshot_(SHEET_NAMES.ORDERS, DEFAULT_HEADERS.Orders);
  var orders = snapshot.records
    .filter(function (record) {
      return isMeaningfulRecord_(record, ["order_id", "customer_phone", "total_price"]);
    })
    .map(buildOrderResponse_)
    .sort(function (left, right) {
      return String(right.orderDate || "").localeCompare(String(left.orderDate || ""));
    });

  return success_(orders, "Orders loaded successfully.");
}

function getCustomerOrders_(payload) {
  var auth = ensureAuthorizedSession_(payload, "customer");

  if (auth.success === false) {
    return auth;
  }

  var customerPhone = normalizePhone_(getField_(auth.record, ["phone"]) || "");
  var snapshot = getSheetSnapshot_(SHEET_NAMES.ORDERS, DEFAULT_HEADERS.Orders);
  var orders = snapshot.records
    .filter(function (record) {
      return (
        isMeaningfulRecord_(record, ["order_id", "customer_phone", "total_price"])
        && normalizePhone_(getField_(record, ["customer_phone", "customerphone"])) === customerPhone
      );
    })
    .map(buildOrderResponse_)
    .sort(function (left, right) {
      return String(right.orderDate || "").localeCompare(String(left.orderDate || ""));
    });

  return success_(orders, "Customer orders loaded successfully.");
}

function updateOrderStatus_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var orderId = String(payload.Order_ID || payload.orderId || "").trim();
  var status = normalizeOrderStatus_(payload.Status || payload.status);

  if (!orderId) {
    return failure_("Order_ID is required.");
  }

  if (!status) {
    return failure_("Status must be Pending, Delivered, or Cancelled.");
  }

  var snapshot = getSheetSnapshot_(SHEET_NAMES.ORDERS, DEFAULT_HEADERS.Orders);
  var record = findRecordByField_(snapshot.records, ["order_id", "id"], orderId);

  if (!record) {
    return failure_("Order not found.");
  }

  setCellByHeader_(snapshot.sheet, snapshot.headers, record.rowNumber, ["status"], status);
  record.normalized[normalizeKey_("Status")] = status;

  return success_(buildOrderResponse_(record), "Order status updated successfully.");
}

function getStaff_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var snapshot = getSheetSnapshot_(SHEET_NAMES.STAFF, DEFAULT_HEADERS.Staff);
  var staff = snapshot.records
    .filter(function (record) {
      return isMeaningfulRecord_(record, ["username", "full_name", "phone"]);
    })
    .map(buildStaffResponse_)
    .sort(function (left, right) {
      return String(left.fullName || "").localeCompare(String(right.fullName || ""), "ar");
    });

  return success_(staff, "Staff loaded successfully.");
}

function addProduct_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var code = normalizeInputText_(payload.Code || "");
  var barcode = normalizeBarcodeInput_(payload.Barcode || "");
  var nameAr = normalizeInputText_(payload.Name_Ar || payload.Name || "");
  var nameEn = normalizeInputText_(payload.Name_En || payload.Name || "");
  var price = parseNumber_(payload.Price);
  var stock = parseNumber_(payload.Stock);
  var categoryName = normalizeInputText_(payload.Category_Name || payload.Category || "");
  var categoryNameEn = normalizeInputText_(payload.Category_Name_En || payload.Category_Name || payload.Category || "");

  if (!code || !nameAr || !nameEn || !categoryName || !categoryNameEn) {
    return failure_("Code, Name_Ar, Name_En, Category_Name, and Category_Name_En are required.");
  }

  if (!Number.isFinite(price) || !Number.isFinite(stock) || price < 0 || stock < 0) {
    return failure_("Price and Stock must be valid positive numbers.");
  }

  var snapshot = getCatalogSnapshot_();
  var existingRecord = findRecordByField_(snapshot.records, ["code"], code);

  if (existingRecord) {
    return failure_("A product with this code already exists.");
  }

  var rowValues = buildRowForSheet_(snapshot.headers, {
    Code: code,
    Barcode: barcode,
    Name_Ar: nameAr,
    Name_En: nameEn,
    Price: Number(price.toFixed(2)),
    Stock: Number(stock),
    Category_Name: categoryName,
    Category_Name_En: categoryNameEn,
  });

  snapshot.sheet.appendRow(rowValues);

  return success_(
    buildProductResponse_(buildRecord_(snapshot.headers, rowValues, snapshot.sheet.getLastRow())),
    "Product added successfully.",
  );
}

function submitFastEntryProduct_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var barcode = normalizeBarcodeInput_(payload.Barcode || payload.barcode || "");
  var productName = normalizeInputText_(payload.Product_Name || payload.productName || payload.Name || "");
  var imageBase64 = String(payload.Image_Base64 || payload.imageBase64 || "").trim();
  var capturedAtInput = String(payload.Captured_At || payload.capturedAt || "").trim();
  var capturedBy = normalizeInputText_(payload.Captured_By || payload.capturedBy || "");
  var costPrice = parseOptionalNumber_(payload.Cost_Price || payload.costPrice);
  var sellingPrice = parseOptionalNumber_(payload.Selling_Price || payload.sellingPrice);
  var discountPercent = parseOptionalNumber_(payload.Discount_Percent || payload.discountPercent);
  var quantity = parseOptionalInteger_(payload.Quantity || payload.quantity);
  var stockAlert = parseOptionalInteger_(payload.Stock_Alert || payload.stockAlert);

  if (!barcode || !productName || !imageBase64) {
    return failure_("Barcode, Product_Name, and Image_Base64 are required.");
  }

  if (costPrice !== null && (!Number.isFinite(costPrice) || costPrice < 0)) {
    return failure_("Cost_Price must be zero or greater.");
  }

  if (sellingPrice !== null && (!Number.isFinite(sellingPrice) || sellingPrice < 0)) {
    return failure_("Selling_Price must be zero or greater.");
  }

  if (
    discountPercent !== null &&
    (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100)
  ) {
    return failure_("Discount_Percent must be between 0 and 100.");
  }

  if (quantity !== null && (!Number.isFinite(quantity) || quantity < 0)) {
    return failure_("Quantity must be zero or greater.");
  }

  if (stockAlert !== null && (!Number.isFinite(stockAlert) || stockAlert < 0)) {
    return failure_("Stock_Alert must be zero or greater.");
  }

  var capturedAtDate = parseDateValue_(capturedAtInput) || new Date();
  var createdAtIso = new Date().toISOString();
  var capturedAtIso = capturedAtDate.toISOString();
  var entryId = createEntityId_("INTAKE", capturedAtDate);
  var fileResult;

  try {
    fileResult = createProductIntakeImageFile_(barcode, productName, imageBase64, capturedAtDate);
  } catch (error) {
    var imageErrorMessage = error && error.message ? error.message : String(error || "Unknown error");
    Logger.log("Product intake image upload failed: " + imageErrorMessage);
    throw new Error("Unable to store the captured product image. " + imageErrorMessage);
  }

  var snapshot = getSheetSnapshot_(SHEET_NAMES.PRODUCT_INTAKE, DEFAULT_HEADERS.Product_Intake);
  var rowValues = buildRowForSheet_(snapshot.headers, {
    Entry_ID: entryId,
    Barcode: barcode,
    Product_Name: productName,
    Cost_Price: costPrice === null ? "" : Number(costPrice.toFixed(2)),
    Selling_Price: sellingPrice === null ? "" : Number(sellingPrice.toFixed(2)),
    Discount_Percent: discountPercent === null ? "" : Number(discountPercent.toFixed(2)),
    Quantity: quantity === null ? "" : quantity,
    Stock_Alert: stockAlert === null ? "" : stockAlert,
    Image_File_ID: fileResult.fileId,
    Image_Url: fileResult.fileUrl,
    Captured_At: capturedAtIso,
    Captured_By: capturedBy,
    Status: PRODUCT_INTAKE_STATUS,
    Created_At: createdAtIso,
  });

  try {
    snapshot.sheet.appendRow(rowValues);
  } catch (error) {
    try {
      fileResult.file.setTrashed(true);
    } catch (cleanupError) {
      Logger.log(
        "Unable to clean up intake image after sheet write failure: "
          + String(cleanupError && cleanupError.message ? cleanupError.message : cleanupError || "Unknown error"),
      );
    }

    throw error;
  }

  return success_(
    {
      id: entryId,
      barcode: barcode,
      productName: productName,
      costPrice: costPrice,
      sellingPrice: sellingPrice,
      discountPercent: discountPercent,
      quantity: quantity,
      stockAlert: stockAlert,
      imageFileId: fileResult.fileId,
      imageUrl: fileResult.fileUrl,
      capturedAt: capturedAtIso,
      capturedBy: capturedBy,
      status: PRODUCT_INTAKE_STATUS,
      created_at: createdAtIso,
    },
    "Fast entry draft saved successfully.",
  );
}

function updateProduct_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var code = normalizeInputText_(payload.Code || "");
  var barcode = normalizeBarcodeInput_(payload.Barcode || "");
  var nameAr = normalizeInputText_(payload.Name_Ar || payload.Name || "");
  var nameEn = normalizeInputText_(payload.Name_En || payload.Name || "");
  var price = parseNumber_(payload.Price);
  var stock = parseNumber_(payload.Stock);
  var categoryName = normalizeInputText_(payload.Category_Name || payload.Category || "");
  var categoryNameEn = normalizeInputText_(payload.Category_Name_En || payload.Category_Name || payload.Category || "");

  if (!code || !nameAr || !nameEn || !categoryName || !categoryNameEn) {
    return failure_("Code, Name_Ar, Name_En, Category_Name, and Category_Name_En are required.");
  }

  if (!Number.isFinite(price) || !Number.isFinite(stock) || price < 0 || stock < 0) {
    return failure_("Price and Stock must be valid positive numbers.");
  }

  var snapshot = getCatalogSnapshot_();
  var record = findRecordByField_(snapshot.records, ["code"], code);

  if (!record) {
    return failure_("Product not found.");
  }

  var rowValues = buildMergedRowForSheet_(snapshot.headers, record, {
    Code: code,
    Barcode: barcode,
    Name_Ar: nameAr,
    Name_En: nameEn,
    Price: Number(price.toFixed(2)),
    Stock: Number(stock),
    Category_Name: categoryName,
    Category_Name_En: categoryNameEn,
  });

  snapshot.sheet.getRange(record.rowNumber, 1, 1, rowValues.length).setValues([rowValues]);

  return success_(
    buildProductResponse_(buildRecord_(snapshot.headers, rowValues, record.rowNumber)),
    "Product updated successfully.",
  );
}

function deleteProduct_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var code = String(payload.Code || payload.code || "").trim();

  if (!code) {
    return failure_("Code is required.");
  }

  var snapshot = getCatalogSnapshot_();
  var record = findRecordByField_(snapshot.records, ["code"], code);

  if (!record) {
    return failure_("Product not found.");
  }

  var deletedProduct = buildProductResponse_(record);
  snapshot.sheet.deleteRow(record.rowNumber);

  return success_(deletedProduct, "Product deleted successfully.");
}

function lookupBarcode_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var barcode = normalizeBarcodeInput_(payload.barcode || payload.Barcode || payload.code || "");

  if (!barcode) {
    return failure_("Barcode is required.");
  }

  if (!BARCODE_LOOKUP_REGEX.test(barcode)) {
    return failure_("Barcode must contain 8 to 14 digits.");
  }

  var matches = [];
  matches = mergeBarcodeLookupMatches_(matches, lookupBarcodeFromOpenFoodFacts_(barcode));
  matches = mergeBarcodeLookupMatches_(matches, lookupBarcodeFromUpcItemDb_(barcode));

  return success_(
    {
      barcode: barcode,
      found: matches.length > 0,
      matches: matches,
      searchedAt: new Date().toISOString(),
    },
    matches.length ? "Barcode lookup completed successfully." : "Product not found, please enter manually.",
  );
}

function mergeBarcodeLookupMatches_(currentMatches, incomingMatches) {
  var dedupe = {};
  var merged = currentMatches.slice();

  merged.forEach(function (match) {
    dedupe[buildBarcodeLookupDedupKey_(match)] = true;
  });

  incomingMatches.forEach(function (match) {
    var key = buildBarcodeLookupDedupKey_(match);

    if (dedupe[key]) {
      return;
    }

    dedupe[key] = true;
    merged.push(match);
  });

  return merged;
}

function buildBarcodeLookupDedupKey_(match) {
  return [
    normalizeBarcodeInput_(match.barcode || ""),
    normalizeText_(match.productName || ""),
    normalizeText_(match.brand || ""),
  ].join("|");
}

function lookupBarcodeFromOpenFoodFacts_(barcode) {
  var response = fetchLookupJson_(
    "https://world.openfoodfacts.net/api/v2/product/"
      + encodeURIComponent(barcode)
      + "?fields=code,product_name,product_name_ar,product_name_en,brands,brands_tags,image_front_url,image_url,categories,status",
  );

  if (!response || Number(response.status) !== 1 || !response.product) {
    return [];
  }

  var product = response.product;
  var productName = firstLookupValue_([
    product.product_name,
    product.product_name_ar,
    product.product_name_en,
  ]);

  if (!productName) {
    return [];
  }

  return [
    buildBarcodeLookupMatch_({
      source: "openFoodFacts",
      barcode: barcode,
      productName: productName,
      brand: firstLookupValue_([product.brands]),
      category: firstLookupValue_([product.categories]),
      imageUrl: firstLookupValue_([product.image_front_url, product.image_url]),
    }),
  ];
}

function lookupBarcodeFromUpcItemDb_(barcode) {
  var response = fetchLookupJson_(
    "https://api.upcitemdb.com/prod/trial/lookup?upc=" + encodeURIComponent(barcode),
  );

  if (!response || response.code !== "OK" || !response.items || !response.items.length) {
    return [];
  }

  return response.items.slice(0, 5).map(function (item) {
    return buildBarcodeLookupMatch_({
      source: "upcItemDb",
      barcode: normalizeBarcodeInput_(item.ean || item.upc || barcode),
      productName: firstLookupValue_([item.title, item.description]),
      brand: firstLookupValue_([item.brand]),
      category: firstLookupValue_([item.category]),
      imageUrl: firstLookupValue_([item.images && item.images[0]]),
    });
  }).filter(function (match) {
    return Boolean(match.productName);
  });
}

function buildBarcodeLookupMatch_(payload) {
  var productName = normalizeInputText_(payload.productName || "");
  var brand = normalizeInputText_(payload.brand || "");
  var category = normalizeLookupCategory_(payload.category || "");
  var barcode = normalizeBarcodeInput_(payload.barcode || "");
  var source = String(payload.source || "");

  return {
    id: source + ":" + (barcode || slugifyValue_(productName || brand || "lookup")),
    barcode: barcode,
    productName: productName,
    brand: brand,
    category: category,
    imageUrl: normalizeInputText_(payload.imageUrl || ""),
    source: source,
  };
}

function firstLookupValue_(values) {
  for (var i = 0; i < values.length; i += 1) {
    var value = normalizeInputText_(values[i]);

    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeLookupCategory_(value) {
  var normalized = normalizeInputText_(value);

  if (!normalized) {
    return "";
  }

  if (normalized.indexOf(">") !== -1) {
    var hierarchy = normalized.split(">").map(function (entry) {
      return normalizeInputText_(entry);
    }).filter(Boolean);

    if (hierarchy.length) {
      return hierarchy[hierarchy.length - 1];
    }
  }

  var commaSeparated = normalized.split(",").map(function (entry) {
    return normalizeInputText_(entry);
  }).filter(function (entry) {
    return entry && entry.indexOf(":") === -1;
  });

  if (commaSeparated.length) {
    return commaSeparated[0];
  }

  return normalized.replace(/[a-z]{2}:/gi, "").trim();
}

function fetchLookupJson_(url) {
  var response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: {
      "User-Agent": PRODUCT_LOOKUP_USER_AGENT,
    },
  });
  var statusCode = response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    return null;
  }

  try {
    return JSON.parse(response.getContentText());
  } catch (error) {
    return null;
  }
}

function addStaff_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var fullName = String(payload.Full_Name || "").trim();
  var username = String(payload.Username || "").trim();
  var phone = String(payload.Phone || "").trim();
  var password = String(payload.Password || "");
  var email = String(payload.Email || "").trim();
  var role = String(payload.Role || "Admin").trim() || "Admin";
  var status = normalizeStaffStatus_(payload.Status || "Active");

  if (!fullName || !username || !phone || !password) {
    return failure_("Full_Name, Username, Phone, and Password are required.");
  }

  if (password.length < 6) {
    return failure_("Password must be at least 6 characters.");
  }

  if (!status) {
    return failure_("Status must be Active, Inactive, or Suspended.");
  }

  var snapshot = getSheetSnapshot_(SHEET_NAMES.STAFF, DEFAULT_HEADERS.Staff);
  var usernameAlreadyUsed = snapshot.records.some(function (record) {
    return normalizeText_(getField_(record, ["username"])) === normalizeText_(username);
  });
  var phoneAlreadyUsed = snapshot.records.some(function (record) {
    return normalizePhone_(getField_(record, ["phone"])) === normalizePhone_(phone);
  });

  if (usernameAlreadyUsed) {
    return failure_("This username is already taken.");
  }

  if (phoneAlreadyUsed) {
    return failure_("A staff member with this phone number already exists.");
  }

  var createdAt = new Date().toISOString();
  var rowValues = buildRowForSheet_(snapshot.headers, {
    Username: username,
    Phone: phone,
    Full_Name: fullName,
    Password_Hash: sha256_(password),
    Email: email,
    Role: role,
    Status: status,
    Created_At: createdAt,
  });

  snapshot.sheet.appendRow(rowValues);

  return success_(
    buildStaffResponse_(buildRecord_(snapshot.headers, rowValues, snapshot.sheet.getLastRow())),
    "Staff member added successfully.",
  );
}

function updateStaffStatus_(payload) {
  var auth = ensureAuthorizedSession_(payload, "admin");

  if (auth.success === false) {
    return auth;
  }

  var staffId = String(payload.Staff_ID || payload.staffId || payload.id || "").trim();
  var username = String(payload.Username || payload.username || "").trim();
  var status = normalizeStaffStatus_(payload.Status || payload.status);

  if (!staffId && !username) {
    return failure_("Staff_ID or Username is required.");
  }

  if (!status) {
    return failure_("Status must be Active, Inactive, or Suspended.");
  }

  var snapshot = getSheetSnapshot_(SHEET_NAMES.STAFF, DEFAULT_HEADERS.Staff);
  var record = null;

  if (staffId) {
    record = snapshot.records.find(function (item) {
      var derivedId = String(getField_(item, ["id"]) || "staff-" + item.rowNumber);
      return normalizeText_(derivedId) === normalizeText_(staffId);
    }) || null;
  }

  if (!record && username) {
    record = findRecordByField_(snapshot.records, ["username"], username);
  }

  if (!record) {
    return failure_("Staff member not found.");
  }

  setCellByHeader_(snapshot.sheet, snapshot.headers, record.rowNumber, ["status"], status);
  record.normalized[normalizeKey_("Status")] = status;

  return success_(buildStaffResponse_(record), "Staff status updated successfully.");
}

/* ------------------------------------------------------------------ */
/*  Sheet / Catalog infrastructure (CORRECTED RESET + AUTO-MIGRATE)   */
/* ------------------------------------------------------------------ */

function getCatalogSnapshot_() {
  return getSheetSnapshotFromSheet_(ensureCatalogSheetWithHeaders_(), DEFAULT_HEADERS.Catalog);
}

function migrateCSVToCatalog() {
  var response = UrlFetchApp.fetch(CATALOG_CSV_URL, {
    muteHttpExceptions: true,
  });
  var statusCode = response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error("Unable to fetch the published catalog CSV.");
  }

  var rows = Utilities.parseCsv(response.getContentText());

  if (!rows.length) {
    return success_(
      {
        insertedRows: 0,
        duplicatesSkipped: 0,
      },
      "The published catalog CSV is empty.",
    );
  }

  var headerRowIndex = findCatalogCsvHeaderRowIndex_(rows);

  if (headerRowIndex === -1) {
    throw new Error("Unable to detect the catalog CSV header row.");
  }

  var columnMap = buildCatalogCsvColumnMap_(rows[headerRowIndex]);
  var seenKeys = {};
  var structuredRows = [];
  var duplicatesSkipped = 0;

  for (var i = headerRowIndex + 1; i < rows.length; i += 1) {
    var structuredRow = buildCatalogRowFromCsv_(rows[i], columnMap);

    if (!structuredRow) {
      continue;
    }

    var dedupeKey = buildCatalogDedupKey_(structuredRow);

    if (seenKeys[dedupeKey]) {
      duplicatesSkipped += 1;
      continue;
    }

    seenKeys[dedupeKey] = true;
    structuredRows.push(structuredRow);
  }

  var sheet = ensureCatalogSheetWithHeaders_();
  var existingRows = Math.max(sheet.getLastRow() - 1, 0);

  if (existingRows > 0) {
    sheet.getRange(2, 1, existingRows, Math.max(sheet.getLastColumn(), DEFAULT_HEADERS.Catalog.length)).clearContent();
  }

  if (structuredRows.length) {
    sheet
      .getRange(2, 1, structuredRows.length, DEFAULT_HEADERS.Catalog.length)
      .setValues(structuredRows);
  }

  return success_(
    {
      insertedRows: structuredRows.length,
      duplicatesSkipped: duplicatesSkipped,
      clearedRows: existingRows,
    },
    "Catalog migration completed successfully.",
  );
}

function ensureCatalogSheetWithHeaders_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAMES.CATALOG);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAMES.CATALOG, 0);
  }

  sheet = ensureHeadersOnSheet_(sheet, DEFAULT_HEADERS.Catalog);

  // Safe version-aware reset: only clear data when the version explicitly changes
  applyCatalogResetIfNeeded_(sheet);

  // Always attempt to fill empty catalog rows from CSV
  autoMigrateCatalogIfNeeded_();

  return sheet;
}

/**
 * Resets the catalog sheet ONLY if a previously stored version exists
 * and differs from the current version. This prevents accidental data loss
 * on every deployment or manual setup run.
 */
function applyCatalogResetIfNeeded_(sheet) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var storedVersion = scriptProperties.getProperty(CATALOG_RESET_PROPERTY);

  // Only clear if there was a previous version that doesn't match
  if (storedVersion && storedVersion !== CATALOG_RESET_VERSION) {
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.deleteRows(2, lastRow - 1);
    }
  }

  // Store the current version so future calls don't reset again
  if (storedVersion !== CATALOG_RESET_VERSION) {
    scriptProperties.setProperty(CATALOG_RESET_PROPERTY, CATALOG_RESET_VERSION);
  }
}

/**
 * Automatically populates the Catalog sheet from the published CSV
 * if the sheet has no data rows (only the header). This runs on every
 * API call that reads the catalog, ensuring it's never empty.
 */
function autoMigrateCatalogIfNeeded_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.CATALOG);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) return; // already populated

  try {
    migrateCSVToCatalog();
  } catch (error) {
    Logger.log('Auto-migration of catalog failed: ' + error.message);
    // The sheet remains empty; manual migration may be needed.
  }
}

/* ------------------------------------------------------------------ */
/*  Generic sheet helpers (unchanged)                                  */
/* ------------------------------------------------------------------ */

function getSheetSnapshot_(sheetName, defaultHeaders) {
  return getSheetSnapshotFromSheet_(ensureSheetWithHeaders_(sheetName, defaultHeaders), defaultHeaders);
}

function getSheetSnapshotFromSheet_(sheet, defaultHeaders) {
  var lastRow = sheet.getLastRow();
  var lastColumn = Math.max(sheet.getLastColumn(), defaultHeaders.length);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value || "").trim();
  });
  var dataRows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : [];
  var records = dataRows
    .map(function (row, index) {
      return buildRecord_(headers, row, index + 2);
    })
    .filter(function (record) {
      return record && Object.keys(record.normalized).length > 0;
    });

  return {
    sheet: sheet,
    headers: headers,
    records: records,
  };
}

function ensureSheetWithHeaders_(sheetName, headers) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return ensureHeadersOnSheet_(sheet, headers);
}

function ensureHeadersOnSheet_(sheet, headers) {
  var existingHeaders = sheet
    .getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
    .getValues()[0]
    .map(function (value) {
      return String(value || "").trim();
    });
  var hasAnyHeader = existingHeaders.some(function (value) {
    return String(value || "").trim() !== "";
  });

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  var normalizedExistingHeaders = {};

  existingHeaders.forEach(function (header, index) {
    if (!header) {
      return;
    }

    normalizedExistingHeaders[normalizeKey_(header)] = index;
  });

  headers.forEach(function (header) {
    var normalizedHeader = normalizeKey_(header);

    if (normalizedExistingHeaders[normalizedHeader] !== undefined) {
      return;
    }

    var blankHeaderIndex = findBlankHeaderIndex_(existingHeaders);

    if (blankHeaderIndex === -1) {
      existingHeaders.push(header);
      normalizedExistingHeaders[normalizedHeader] = existingHeaders.length - 1;
      return;
    }

    existingHeaders[blankHeaderIndex] = header;
    normalizedExistingHeaders[normalizedHeader] = blankHeaderIndex;
  });

  sheet.getRange(1, 1, 1, existingHeaders.length).setValues([existingHeaders]);
  return sheet;
}

function findBlankHeaderIndex_(headers) {
  for (var i = 0; i < headers.length; i += 1) {
    if (!String(headers[i] || "").trim()) {
      return i;
    }
  }

  return -1;
}

function buildRecord_(headers, row, rowNumber) {
  var normalized = {};

  headers.forEach(function (header, index) {
    if (!header) {
      return;
    }

    normalized[normalizeKey_(header)] = row[index];
  });

  return {
    rowNumber: rowNumber,
    normalized: normalized,
  };
}

function buildRowForSheet_(headers, valuesByKey) {
  var normalizedValues = {};

  Object.keys(valuesByKey).forEach(function (key) {
    normalizedValues[normalizeKey_(key)] = valuesByKey[key];
  });

  return headers.map(function (header) {
    var value = normalizedValues[normalizeKey_(header)];
    return sanitizeCellValue_(value);
  });
}

function buildMergedRowForSheet_(headers, record, valuesByKey) {
  var normalizedUpdates = {};

  Object.keys(valuesByKey).forEach(function (key) {
    normalizedUpdates[normalizeKey_(key)] = valuesByKey[key];
  });

  return headers.map(function (header) {
    var normalizedHeader = normalizeKey_(header);
    var value = Object.prototype.hasOwnProperty.call(normalizedUpdates, normalizedHeader)
      ? normalizedUpdates[normalizedHeader]
      : record.normalized[normalizedHeader];

    return sanitizeCellValue_(value);
  });
}

function getCustomerLookup_() {
  var sheet = ensureSheetWithHeaders_(SHEET_NAMES.CUSTOMERS, DEFAULT_HEADERS.Customers);
  var lastRow = sheet.getLastRow();
  var lastColumn = Math.max(sheet.getLastColumn(), DEFAULT_HEADERS.Customers.length);
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function (value) {
    return String(value || "").trim();
  });
  var rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : [];

  return {
    sheet: sheet,
    headers: headers,
    headerMap: buildHeaderIndexMap_(headers),
    rows: rows,
  };
}

function buildHeaderIndexMap_(headers) {
  var headerMap = {};

  headers.forEach(function (header, index) {
    if (!header) {
      return;
    }

    headerMap[normalizeKey_(header)] = index;
  });

  return headerMap;
}

function findCustomerByPhoneInLookup_(lookup, phone) {
  var normalizedPhone = normalizePhone_(phone);
  var phoneIndex = lookup.headerMap[normalizeKey_("Phone")];

  if (phoneIndex === undefined) {
    throw new Error("Phone column was not found in the Customers sheet.");
  }

  for (var i = 0; i < lookup.rows.length; i += 1) {
    var storedPhone = normalizePhone_(lookup.rows[i][phoneIndex]);

    if (storedPhone && storedPhone === normalizedPhone) {
      var sheetRow = i + 2;

      return {
        index: i,
        sheetRow: sheetRow,
        rowValues: lookup.rows[i],
        record: buildRecord_(lookup.headers, lookup.rows[i], sheetRow),
      };
    }
  }

  return null;
}

function clearCustomerOtpFields_(lookup, match) {
  var updatedRow = buildMergedRowForSheet_(lookup.headers, match.record, {
    OTP: "",
    OTP_Expiry: "",
  });

  lookup.sheet
    .getRange(match.sheetRow, 1, 1, lookup.headers.length)
    .setValues([updatedRow]);
}

function findUserRecord_(records, usernameOrPhone) {
  var normalizedIdentifier = normalizeText_(usernameOrPhone);
  var normalizedPhone = normalizePhone_(usernameOrPhone);

  for (var i = 0; i < records.length; i += 1) {
    var record = records[i];
    var status = normalizeText_(getField_(record, ["status"])) || "active";

    if (status === "inactive" || status === "disabled" || status === "blocked" || status === "suspended") {
      continue;
    }

    var username = normalizeText_(getField_(record, ["username"]));
    var email = normalizeText_(getField_(record, ["email"]));
    var phone = normalizePhone_(getField_(record, ["phone"]));

    if (username && username === normalizedIdentifier) {
      return record;
    }

    if (email && email === normalizedIdentifier) {
      return record;
    }

    if (phone && phone === normalizedPhone) {
      return record;
    }
  }

  return null;
}

function findRecordByField_(records, candidateKeys, expectedValue) {
  var normalizedExpected = normalizeText_(expectedValue);

  for (var i = 0; i < records.length; i += 1) {
    var actualValue = normalizeText_(getField_(records[i], candidateKeys));

    if (actualValue && actualValue === normalizedExpected) {
      return records[i];
    }
  }

  return null;
}

function isMeaningfulRecord_(record, candidateKeys) {
  return Boolean(String(getField_(record, candidateKeys) || "").trim());
}

function buildUserResponse_(record, role, session) {
  var response = {
    id: String(getField_(record, ["id"]) || role + "-" + record.rowNumber),
    role: role,
    fullName: String(getField_(record, ["full_name", "fullname", "name"]) || ""),
    phone: String(getField_(record, ["phone"]) || ""),
    username: String(getField_(record, ["username"]) || ""),
    email: String(getField_(record, ["email"]) || ""),
    address: String(getField_(record, ["address"]) || ""),
    created_at: String(getField_(record, ["created_at", "createdat"]) || ""),
  };

  if (session && session.sessionToken) {
    response.sessionToken = String(session.sessionToken);
    response.sessionExpiresAt = String(session.sessionExpiresAt || "");
  }

  return response;
}

function buildOrderResponse_(record) {
  var orderDate = formatDateOutput_(getField_(record, ["order_date", "orderdate"]));
  var productCodes = String(getField_(record, ["product_codes", "productcodes"]) || "").trim();
  var paymentMethod = normalizeOrderPaymentMethod_(getField_(record, ["payment_method", "paymentmethod"]) || "cod") || "cod";
  var paymentLabel = normalizeInputText_(getField_(record, ["payment_label", "paymentlabel"]) || "");
  var requestPosMachine = parseBooleanValue_(getField_(record, ["pos_requested", "posrequested"]));

  return {
    id: String(getField_(record, ["order_id", "id"]) || "ORD-" + record.rowNumber),
    customerPhone: String(getField_(record, ["customer_phone", "customerphone", "phone"]) || ""),
    customerName: String(getField_(record, ["customer_name", "customername", "full_name", "fullname", "name"]) || ""),
    productCodes: productCodes,
    totalPrice: Number(readNumberField_(record, ["total_price", "totalprice"]).toFixed(2)),
    address: String(getField_(record, ["address"]) || ""),
    note: String(getField_(record, ["note"]) || ""),
    orderDate: orderDate,
    status: normalizeOrderStatus_(getField_(record, ["status"]) || "Pending") || "Pending",
    paymentMethod: paymentMethod,
    paymentLabel: paymentLabel,
    requestPosMachine: requestPosMachine,
  };
}

function buildProductResponse_(record) {
  var code = normalizeInputText_(getField_(record, ["code"]) || "");
  var nameAr = normalizeInputText_(getField_(record, ["name_ar", "name"]) || "");
  var nameEn = normalizeInputText_(getField_(record, ["name_en", "name"]) || "");
  var categoryName = normalizeInputText_(getField_(record, ["category_name", "category"]) || "");
  var categoryNameEn = normalizeInputText_(getField_(record, ["category_name_en", "category_name", "category"]) || "");
  var stock = readNumberField_(record, ["stock"]);

  if (!nameAr && nameEn) {
    nameAr = nameEn;
    Logger.log("Catalog warning: missing Name_Ar for code %s; falling back to Name_En.", code || ("row-" + record.rowNumber));
  }

  if (!nameEn && nameAr) {
    nameEn = nameAr;
    Logger.log("Catalog warning: missing Name_En for code %s; falling back to Name_Ar.", code || ("row-" + record.rowNumber));
  }

  if (!categoryName && categoryNameEn) {
    categoryName = categoryNameEn;
    Logger.log("Catalog warning: missing Category_Name for code %s; falling back to Category_Name_En.", code || ("row-" + record.rowNumber));
  }

  if (!categoryNameEn && categoryName) {
    categoryNameEn = categoryName;
    Logger.log("Catalog warning: missing Category_Name_En for code %s; falling back to Category_Name.", code || ("row-" + record.rowNumber));
  }

  return {
    id: code || "product-" + record.rowNumber,
    code: code,
    barcode: normalizeBarcodeInput_(getField_(record, ["barcode"]) || ""),
    name: nameAr || nameEn,
    nameAr: nameAr,
    nameEn: nameEn,
    price: Number(readNumberField_(record, ["price"]).toFixed(2)),
    stock: stock,
    category: slugifyValue_(categoryName),
    categoryName: categoryName,
    categoryNameEn: categoryNameEn,
    inStock: stock > 0,
  };
}

function buildStaffResponse_(record) {
  return {
    id: String(getField_(record, ["id"]) || "staff-" + record.rowNumber),
    fullName: String(getField_(record, ["full_name", "fullname", "name"]) || ""),
    username: String(getField_(record, ["username"]) || ""),
    role: String(getField_(record, ["role"]) || "Admin"),
    phone: String(getField_(record, ["phone"]) || ""),
    email: String(getField_(record, ["email"]) || ""),
    status: normalizeStaffStatus_(getField_(record, ["status"]) || "Active") || "Active",
  };
}

function passwordMatches_(record, plainPassword, hashedPassword) {
  var storedHash = String(getField_(record, ["password_hash", "passwordhash"]) || "").trim();
  var storedPlain = String(getField_(record, ["password"]) || "").trim();

  if (storedHash) {
    return storedHash === hashedPassword;
  }

  return storedPlain && storedPlain === plainPassword;
}

function getField_(record, candidateKeys) {
  for (var i = 0; i < candidateKeys.length; i += 1) {
    var value = record.normalized[normalizeKey_(candidateKeys[i])];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function readNumberField_(record, candidateKeys) {
  return parseNumber_(getField_(record, candidateKeys));
}

function setCellByHeader_(sheet, headers, rowNumber, candidateKeys, value) {
  var headerIndex = findHeaderIndex_(headers, candidateKeys);

  if (headerIndex === -1) {
    throw new Error("Unable to find target column for update.");
  }

  sheet.getRange(rowNumber, headerIndex + 1).setValue(sanitizeCellValue_(value));
}

function findHeaderIndex_(headers, candidateKeys) {
  var normalizedCandidates = candidateKeys.map(function (key) {
    return normalizeKey_(key);
  });

  for (var i = 0; i < headers.length; i += 1) {
    if (normalizedCandidates.indexOf(normalizeKey_(headers[i])) !== -1) {
      return i;
    }
  }

  return -1;
}

function buildOrdersByDaySeries_(records, days) {
  var bucketCount = days || 7;
  var buckets = {};
  var keys = [];
  var today = new Date();

  today.setHours(0, 0, 0, 0);

  for (var i = bucketCount - 1; i >= 0; i -= 1) {
    var date = new Date(today);
    date.setDate(today.getDate() - i);
    var key = formatDateKey_(date);

    keys.push(key);
    buckets[key] = {
      day: key,
      label: key,
      orders: 0,
      sales: 0,
    };
  }

  records.forEach(function (record) {
    if (!isMeaningfulRecord_(record, ["order_id", "order_date"])) {
      return;
    }

    var date = parseDateValue_(getField_(record, ["order_date", "orderdate"]));

    if (!date) {
      return;
    }

    var key = formatDateKey_(date);

    if (!buckets[key]) {
      return;
    }

    buckets[key].orders += 1;
    buckets[key].sales += readNumberField_(record, ["total_price", "totalprice"]);
    buckets[key].sales = Number(buckets[key].sales.toFixed(2));
  });

  return keys.map(function (key) {
    return buckets[key];
  });
}

function findCatalogCsvHeaderRowIndex_(rows) {
  // We look for a row that contains at least three of the known header names
  // (after normalisation). This avoids fragile alias matching.
  var REQUIRED_SIGNATURES = ['code', 'name_ar', 'price'];

  for (var i = 0; i < rows.length; i++) {
    var normalized = rows[i].map(normalizeCatalogCsvHeader_);
    var found = REQUIRED_SIGNATURES.every(function(sig) {
      return normalized.indexOf(sig) !== -1;
    });
    if (found) {
      return i;
    }
  }
  return -1;
}

function buildCatalogCsvColumnMap_(headerRow) {
  // Direct mapping based on the known headers from your published sheet.
  // This uses the EXACT casing you see in the logs (converted to lower-case)
  // and works even if columns are in a different order.
  var row = headerRow.map(normalizeCatalogCsvHeader_);
  var columnMap = {};

  // Map each required column to its index
  columnMap.Code = row.indexOf('code');
  columnMap.Barcode = row.indexOf('barcode');
  columnMap.Name_Ar = row.indexOf('name_ar');
  columnMap.Name_En = row.indexOf('name_en');
  columnMap.Price = row.indexOf('price');
  columnMap.Stock = row.indexOf('stock');
  columnMap.Category_Name = row.indexOf('category_name');
  columnMap.Category_Name_En = row.indexOf('category_name_en');

  // If Code or Name_Ar are missing, we cannot proceed.
  if (columnMap.Code === -1 || columnMap.Name_Ar === -1) {
    throw new Error(
      'CSV is missing required columns. Found: ' + headerRow.join(', ')
    );
  }

  // Optional columns that might not exist in your sheet
  if (columnMap.Name_En === -1) columnMap.Name_En = -1;
  if (columnMap.Category_Name_En === -1) columnMap.Category_Name_En = -1;

  return columnMap;
}

function buildCatalogRowFromCsv_(row, columnMap) {
  var code = readCatalogCsvCell_(row, columnMap.Code);
  var barcode = readCatalogCsvCell_(row, columnMap.Barcode);
  var nameAr = readCatalogCsvCell_(row, columnMap.Name_Ar);
  var nameEn = readCatalogCsvCell_(row, columnMap.Name_En);
  var price = parseNumber_(readCatalogCsvCell_(row, columnMap.Price));
  var stock = parseNumber_(readCatalogCsvCell_(row, columnMap.Stock));
  var categoryName = readCatalogCsvCell_(row, columnMap.Category_Name);
  var categoryNameEn = readCatalogCsvCell_(row, columnMap.Category_Name_En);

  if (!code && !barcode && !nameAr && !nameEn && !price && !stock && !categoryName && !categoryNameEn) {
    return null;
  }

  if (!nameAr && !nameEn) {
    return null;
  }

  if (!nameAr && nameEn) {
    nameAr = nameEn;
  }

  if (!nameEn && nameAr) {
    nameEn = nameAr;
  }

  if (!categoryName && categoryNameEn) {
    categoryName = categoryNameEn;
  }

  if (!categoryNameEn && categoryName) {
    categoryNameEn = categoryName;
  }

  return [
    code,
    barcode,
    nameAr,
    nameEn,
    Number(price.toFixed(2)),
    Number(stock.toFixed(2)),
    categoryName,
    categoryNameEn,
  ];
}

function buildCatalogDedupKey_(structuredRow) {
  var code = normalizeText_(structuredRow[0]);
  var barcode = normalizeText_(structuredRow[1]);
  var name = normalizeText_(structuredRow[2] || structuredRow[3]);
  var category = normalizeText_(structuredRow[6] || structuredRow[7]);

  if (code) {
    return "code:" + code;
  }

  if (barcode) {
    return "barcode:" + barcode;
  }

  return "name:" + name + "|category:" + category;
}

function readCatalogCsvCell_(row, index) {
  if (index === -1) {
    return "";
  }

  return normalizeInputText_((row && row[index]) || "");
}

function getSearchSuggestions_(payload) {
  var query = normalizeText_(payload.q || payload.query || "");
  var lang = normalizeText_(payload.lang || "") === "en" ? "en" : "ar";

  if (!query) {
    return [];
  }

  return getCatalogSnapshot_().records
    .filter(function (record) {
      return catalogRecordMatchesQuery_(record, query);
    })
    .slice(0, 8)
    .map(function (record) {
      var product = buildProductResponse_(record);
      var variationType = lang === "en" ? product.categoryNameEn : product.categoryName;

      return {
        product_id: product.id,
        name_en: product.nameEn,
        name_ar: product.nameAr,
        variations: variationType
          ? [
              {
                type: variationType,
              },
            ]
          : [],
      };
    });
}

function catalogRecordMatchesQuery_(record, query) {
  var haystacks = [
    getField_(record, ["code"]),
    getField_(record, ["barcode"]),
    getField_(record, ["name_ar", "name"]),
    getField_(record, ["name_en", "name"]),
    getField_(record, ["category_name", "category"]),
    getField_(record, ["category_name_en", "category_name", "category"]),
  ];

  return haystacks.some(function (value) {
    return normalizeText_(value).indexOf(query) !== -1;
  });
}

function parsePostBody_(e) {
  var rawBody = e && e.postData && e.postData.contents ? e.postData.contents : "{}";

  try {
    return JSON.parse(repairTextEncoding_(rawBody));
  } catch (error) {
    throw new Error("Invalid JSON body.");
  }
}

function getPostAction_(e, body) {
  var actionFromParams = e && e.parameter && e.parameter.action ? e.parameter.action : "";
  var actionFromBody = body && body.action ? body.action : "";
  return normalizeText_(actionFromParams || actionFromBody);
}

function getPostData_(body) {
  if (!body || typeof body !== "object") {
    return {};
  }

  if (body.data && typeof body.data === "object") {
    return body.data;
  }

  var payload = {};

  Object.keys(body).forEach(function (key) {
    if (key === "action") {
      return;
    }

    payload[key] = body[key];
  });

  return payload;
}

function withScriptLock_(callback) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function createOrderId_(date) {
  return createEntityId_("ORD", date);
}

function createOtpCode_() {
  return ("000000" + Math.floor(Math.random() * 1000000)).slice(-6);
}

function createOtpExpiryDate_() {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}

function maskOtpForLog_(otp) {
  var value = String(otp || "").trim();

  if (!value) {
    return "(empty)";
  }

  if (value.length <= 2) {
    return Array(value.length + 1).join("*");
  }

  return value.slice(0, 1) + Array(value.length - 1).join("*") + value.slice(-1);
}

function sendCustomerOtpEmail_(email, fullName, otp) {
  var safeName = String(fullName || "").trim() || "Customer";
  var subject = "Verify Your United Pharmacies Account";
  var htmlBody =
    '<div style="margin:0;padding:24px;background:#f4fbfa;font-family:Arial,sans-serif;color:#0f172a;">'
    + '<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #d9eeeb;border-radius:20px;overflow:hidden;">'
    + '<div style="padding:24px 28px;background:linear-gradient(135deg,#0f766e,#0f172a);color:#ffffff;">'
    + '<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#99f6e4;">United Pharmacies</p>'
    + '<h2 style="margin:0;font-size:28px;line-height:1.2;">Verify Your Account</h2>'
    + '</div>'
    + '<div style="padding:28px;">'
    + '<p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Hello ' + escapeHtml_(safeName) + ',</p>'
    + '<p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#334155;">Use the verification code below to activate your customer account. This code expires in 10 minutes.</p>'
    + '<div style="margin:0 0 20px;padding:18px 20px;border:1px solid #c7ece7;border-radius:18px;background:#f0fdfa;text-align:center;">'
    + '<div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#0f766e;">Verification Code</div>'
    + '<div style="margin-top:10px;font-size:34px;font-weight:800;letter-spacing:0.34em;color:#0f172a;">' + escapeHtml_(otp) + '</div>'
    + '</div>'
    + '<p style="margin:0 0 12px;font-size:14px;line-height:1.8;color:#475569;">If you did not request this code, you can safely ignore this email.</p>'
    + '<p style="margin:0;font-size:14px;line-height:1.8;color:#475569;">Thank you,<br/>United Pharmacies Team</p>'
    + '</div>'
    + '</div>'
    + '</div>';

  GmailApp.sendEmail(email, subject, "", {
    name: "United Pharmacies",
    htmlBody: htmlBody,
  });
}

function createProductIntakeImageFile_(barcode, productName, imageBase64, capturedAtDate) {
  var parsedImage = parseImageDataUrl_(imageBase64);
  var folder = getProductIntakeDriveFolder_();
  var fileName = buildProductIntakeFileName_(barcode, productName, parsedImage.extension, capturedAtDate);
  var blob = Utilities.newBlob(parsedImage.bytes, parsedImage.mimeType, fileName);
  var file = folder.createFile(blob);

  return {
    file: file,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
  };
}

function getProductIntakeDriveFolder_() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var folderId = scriptProperties.getProperty(PRODUCT_INTAKE_FOLDER_ID_PROPERTY);

  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (error) {
      Logger.log("Stored Product Intake folder ID is invalid: " + String(error && error.message ? error.message : error || "Unknown error"));
      scriptProperties.deleteProperty(PRODUCT_INTAKE_FOLDER_ID_PROPERTY);
    }
  }

  var existingFolders = DriveApp.getFoldersByName(PRODUCT_INTAKE_FOLDER_NAME);
  var folder = existingFolders.hasNext()
    ? existingFolders.next()
    : DriveApp.createFolder(PRODUCT_INTAKE_FOLDER_NAME);

  scriptProperties.setProperty(PRODUCT_INTAKE_FOLDER_ID_PROPERTY, folder.getId());
  return folder;
}

function parseImageDataUrl_(value) {
  var match = String(value || "").trim().match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i);

  if (!match) {
    throw new Error("The captured image format is invalid.");
  }

  return {
    mimeType: match[1],
    bytes: Utilities.base64Decode(match[2]),
    extension: getImageFileExtension_(match[1]),
  };
}

function getImageFileExtension_(mimeType) {
  var normalizedMimeType = String(mimeType || "").trim().toLowerCase();

  if (normalizedMimeType === "image/jpeg" || normalizedMimeType === "image/jpg") {
    return "jpg";
  }

  if (normalizedMimeType === "image/png") {
    return "png";
  }

  if (normalizedMimeType === "image/webp") {
    return "webp";
  }

  if (normalizedMimeType === "image/gif") {
    return "gif";
  }

  return "bin";
}

function buildProductIntakeFileName_(barcode, productName, extension, capturedAtDate) {
  var safeDate = capturedAtDate instanceof Date && !Number.isNaN(capturedAtDate.getTime())
    ? capturedAtDate
    : new Date();
  var timestamp = Utilities.formatDate(safeDate, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  var safeBarcode = sanitizeDriveFileSegment_(barcode) || "barcode";
  var safeName = sanitizeDriveFileSegment_(productName) || "product";
  var safeExtension = String(extension || "jpg").trim().replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";

  return "intake-" + timestamp + "-" + safeBarcode + "-" + safeName + "." + safeExtension;
}

function sanitizeDriveFileSegment_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createEntityId_(prefix, date) {
  var safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  var timestamp = Utilities.formatDate(safeDate, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  return prefix + "-" + timestamp + "-" + Utilities.getUuid().slice(0, 6).toUpperCase();
}

function parseNumber_(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  var normalized = String(value || "").replace(/,/g, "").trim();
  var parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNumber_(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  var parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : NaN;
}

function parseOptionalInteger_(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  var parsed = Number(String(value).replace(/,/g, "").trim());

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return NaN;
  }

  return parsed;
}

function parseDateValue_(value) {
  if (!value && value !== 0) {
    return null;
  }

  if (Object.prototype.toString.call(value) === "[object Date]" && !Number.isNaN(value.getTime())) {
    return value;
  }

  var date = new Date(String(value).trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateKey_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function formatDateOutput_(value) {
  var date = parseDateValue_(value);

  if (!date) {
    return String(value || "");
  }

  return date.toISOString();
}

function sha256_(value) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8,
  );

  return digest.map(function (byte) {
    var normalized = byte < 0 ? byte + 256 : byte;
    return ("0" + normalized.toString(16)).slice(-2);
  }).join("");
}

function sanitizeCellValue_(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return value;
  }

  if (Object.prototype.toString.call(value) === "[object Date]") {
    return value;
  }

  var text = normalizeInputText_(value);

  if (/^[=+\-@]/.test(text)) {
    return "'" + text;
  }

  return text;
}

function normalizeText_(value) {
  return normalizeInputText_(value).toLowerCase();
}

function repairTextEncoding_(value) {
  var text = String(value || "");

  if (!text || !MOJIBAKE_TEXT_PATTERN_.test(text)) {
    return text;
  }

  var bytes = [];

  for (var index = 0; index < text.length; index += 1) {
    var codePoint = text.codePointAt(index);

    if (codePoint === undefined) {
      return text;
    }

    if (codePoint > 65535) {
      index += 1;
    }

    if (codePoint <= 255) {
      bytes.push(codePoint);
      continue;
    }

    var mappedByte = WINDOWS_1252_ENCODE_MAP_[codePoint];

    if (mappedByte === undefined) {
      return text;
    }

    bytes.push(mappedByte);
  }

  try {
    return Utilities.newBlob(bytes).getDataAsString("UTF-8");
  } catch (error) {
    return text;
  }
}

function normalizeInputText_(value) {
  return repairTextEncoding_(String(value || "")).trim();
}

function normalizeBarcodeInput_(value) {
  return normalizeInputText_(value).replace(/\s+/g, "").replace(/[^0-9A-Za-z-]+/g, "");
}

function normalizePhone(value) {
  var digits = String(value || "").replace(/\D/g, "").trim();

  if (digits.indexOf("0020") === 0) {
    digits = "0" + digits.slice(4);
  } else if (digits.indexOf("20") === 0 && digits.length === 12) {
    digits = "0" + digits.slice(2);
  } else if (digits.length === 10 && digits.charAt(0) === "1") {
    digits = "0" + digits;
  }

  return digits;
}

function normalizePhone_(value) {
  return normalizePhone(value);
}

function normalizeCatalogCsvHeader_(value) {
  return normalizeInputText_(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeKey_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeOrderStatus_(value) {
  var normalized = normalizeText_(value);

  if (normalized === "pending") {
    return "Pending";
  }

  if (normalized === "delivered") {
    return "Delivered";
  }

  if (normalized === "cancelled" || normalized === "canceled") {
    return "Cancelled";
  }

  return "";
}

function normalizeOrderPaymentMethod_(value) {
  var normalized = normalizeText_(value);

  if (
    normalized === "cod"
    || normalized === "instapay"
    || normalized === "vodafone"
    || normalized === "online"
    || normalized === "banquemisr"
  ) {
    return normalized;
  }

  return "";
}

function normalizeStaffStatus_(value) {
  var normalized = normalizeText_(value);

  if (normalized === "active") {
    return "Active";
  }

  if (normalized === "inactive") {
    return "Inactive";
  }

  if (normalized === "suspended" || normalized === "disabled" || normalized === "blocked") {
    return "Suspended";
  }

  return "";
}

function parseBooleanValue_(value) {
  var normalized = normalizeText_(value);

  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizeCustomerStatus_(value) {
  var normalized = normalizeText_(value);

  if (normalized === "pending") {
    return "Pending";
  }

  if (normalized === "active") {
    return "Active";
  }

  if (normalized === "inactive") {
    return "Inactive";
  }

  if (normalized === "suspended" || normalized === "disabled" || normalized === "blocked") {
    return "Suspended";
  }

  return "";
}

function slugifyValue_(value) {
  return normalizeInputText_(value)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || "general";
}

function success_(data, message) {
  return {
    success: true,
    data: data,
    message: message || "",
  };
}

function failure_(message) {
  return {
    success: false,
    message: message,
  };
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}