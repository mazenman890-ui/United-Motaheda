import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FileText, RefreshCcw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "../components/BrandPrimitives";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { readOrders, syncRemoteOrders, type StoredOrder } from "../orders";
import {
  appendReturnRequest,
  readReturnRequests,
  type ReturnReason,
  type ReturnRequestStatus,
  type StoredReturnRequest,
} from "../returns";
import {
  getCachedCustomerOrders,
  getCustomerOrders,
} from "../../services/shopperOrdersApi";

const RETURN_REASONS: Array<{
  value: ReturnReason;
  labelAr: string;
  labelEn: string;
}> = [
  { value: "damaged", labelAr: "تلف عند الاستلام", labelEn: "Damaged on delivery" },
  { value: "wrong-item", labelAr: "تم استلام صنف غير صحيح", labelEn: "Wrong item received" },
  { value: "expired", labelAr: "تاريخ الصلاحية غير مناسب", labelEn: "Expiry concern" },
  { value: "quality-issue", labelAr: "مشكلة في الجودة أو العبوة", labelEn: "Quality or packaging issue" },
  { value: "missing-item", labelAr: "نقص في الطلب", labelEn: "Missing item" },
  { value: "other", labelAr: "سبب آخر", labelEn: "Other reason" },
];

const STATUS_STEPS: ReturnRequestStatus[] = ["Requested", "Approved", "Rejected", "Processed"];

function formatReturnStatus(status: ReturnRequestStatus, lang: "ar" | "en") {
  if (lang === "ar") {
    return {
      Requested: "تم الاستلام",
      Approved: "تمت الموافقة",
      Rejected: "مرفوض",
      Processed: "تمت المعالجة",
    }[status];
  }

  return status;
}

function getReasonLabel(reason: ReturnReason, lang: "ar" | "en") {
  const option = RETURN_REASONS.find((item) => item.value === reason);
  return lang === "ar" ? option?.labelAr ?? reason : option?.labelEn ?? reason;
}

function getStatusTone(status: ReturnRequestStatus) {
  if (status === "Approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "Processed") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function TermsList({ lang }: { lang: "ar" | "en" }) {
  const items =
    lang === "ar"
      ? [
          "لا تُقبل طلبات إرجاع الأدوية والمنتجات الطبية التي تم فتحها أو استخدامها أو تعريضها لظروف تخزين غير مناسبة.",
          "المنتجات المبردة، والمستلزمات المعقمة، والمنتجات المخصصة للاستخدام الشخصي أو الصحي قد تكون غير قابلة للإرجاع بعد التسليم.",
          "يجب تقديم طلب الإرجاع خلال 48 ساعة من استلام الطلب، مع الاحتفاظ بالعبوة الأصلية والفاتورة أو رقم الطلب.",
          "تتم مراجعة الطلب بعد التحقق من هوية العميل، وبيانات الطلب، وحالة المنتج، وقد يُطلب إثبات مصور عند الحاجة.",
          "تخضع الموافقة النهائية لسياسات تداول المستحضرات الدوائية ومتطلبات السلامة المعتمدة لدى الصيدلية.",
        ]
      : [
          "Opened, used, or improperly stored medicines and medical products are not eligible for return review.",
          "Chilled items, sterile supplies, and personal-use health products may be non-returnable after delivery.",
          "A return request must be submitted within 48 hours of delivery with the original packaging and invoice or order number.",
          "Approval requires identity, order, and product-condition verification, and photo evidence may be requested when needed.",
          "Final approval remains subject to pharmacy handling rules and applicable pharmaceutical safety requirements.",
        ];

  return (
    <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-950">
            {lang === "ar" ? "الشروط والأحكام" : "Terms and Conditions"}
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {lang === "ar"
              ? "تنطبق هذه الشروط على مراجعة طلبات الإرجاع للمنتجات الطبية."
              : "These terms govern the review of medical-product return requests."}
          </p>
        </div>
      </div>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-7 text-slate-700"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Returns() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [requests, setRequests] = useState<StoredReturnRequest[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [reason, setReason] = useState<ReturnReason>("damaged");
  const [details, setDetails] = useState("");
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user?.phone) {
      setOrders([]);
      setRequests([]);
      return;
    }

    const cachedOrders = getCachedCustomerOrders();

    if (cachedOrders?.length) {
      const syncedOrders = syncRemoteOrders(cachedOrders, user.phone).filter(
        (order) => order.phone === user.phone,
      );
      setOrders(syncedOrders);
    } else {
      setOrders(readOrders().filter((order) => order.phone === user.phone));
    }

    setRequests(readReturnRequests(user.phone));
    setIsLoadingOrders(true);

    let active = true;

    void getCustomerOrders(true)
      .then((remoteOrders) => {
        if (!active || !user.phone) {
          return;
        }

        setOrders(
          syncRemoteOrders(remoteOrders, user.phone).filter((order) => order.phone === user.phone),
        );
      })
      .catch(() => {
        if (!active || !user.phone) {
          return;
        }

        setOrders(readOrders().filter((order) => order.phone === user.phone));
      })
      .finally(() => {
        if (active) {
          setIsLoadingOrders(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  useEffect(() => {
    setSelectedItemId("");
  }, [selectedOrderId]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const formatDate = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
        dateStyle: "medium",
      }),
    [lang],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user?.phone || !selectedOrder) {
      return;
    }

    const selectedItem =
      selectedItemId.length > 0
        ? selectedOrder.items.find((item) => item.productId === selectedItemId) ?? null
        : null;

    const nextRequest = appendReturnRequest({
      phone: user.phone,
      order: selectedOrder,
      itemId: selectedItem?.productId ?? null,
      itemName: selectedItem?.name ?? null,
      reason,
      details,
    });

    setRequests((current) => [nextRequest, ...current]);
    setDetails("");
    setReason("damaged");
    setSelectedItemId("");
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6fcfc_0%,#f8fbfd_38%,#ffffff_100%)]">
      <PageHero
        lang={lang}
        crumbs={[
          { label: lang === "ar" ? "الرئيسية" : "Home", to: "/" },
          { label: lang === "ar" ? "الإرجاع" : "Returns" },
        ]}
        eyebrow={
          <span className="badge-teal border-0 bg-white text-teal-700 shadow-sm">
            <RefreshCcw className="h-4 w-4" />
            {lang === "ar" ? "مراجعة طلبات الإرجاع" : "Return request review"}
          </span>
        }
        title={lang === "ar" ? "طلبات الإرجاع" : "Returns"}
        description={
          lang === "ar"
            ? "قدّم طلب إرجاع مرتبطاً بطلبك، وراجع حالته، واطلع على الشروط المنظمة للمنتجات الطبية."
            : "Submit a return request linked to your order, review its status, and read the rules that govern medical-product returns."
        }
        stats={
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {lang === "ar" ? "الطلبات المتاحة" : "Eligible orders"}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">{orders.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {lang === "ar" ? "طلبات الإرجاع" : "Return requests"}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">{requests.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {lang === "ar" ? "الحالة الحالية" : "Latest status"}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {requests[0] ? formatReturnStatus(requests[0].status, lang) : "-"}
              </p>
            </div>
          </div>
        }
        aside={
          <div className="space-y-4">
            <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    {lang === "ar" ? "خطوات الطلب" : "Process"}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {lang === "ar"
                      ? "اختر الطلب، حدد السبب، ثم أرسل المراجعة."
                      : "Choose the order, select the reason, and submit the review."}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-2">
                {STATUS_STEPS.map((status) => (
                  <div
                    key={status}
                    className={getStatusTone(status).concat(
                      " rounded-2xl border px-4 py-3 text-sm font-black",
                    )}
                  >
                    {formatReturnStatus(status, lang)}
                  </div>
                ))}
              </div>
            </div>

            {!user ? (
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-base font-black text-slate-950">
                  {lang === "ar" ? "سجّل الدخول لربط الطلبات" : "Sign in to link your orders"}
                </p>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                  {lang === "ar"
                    ? "يمكنك مراجعة الشروط الآن، ثم تسجيل الدخول لتقديم طلب إرجاع مرتبط بطلبك."
                    : "You can review the terms now, then sign in to submit a return request linked to your order."}
                </p>
                <Link
                  to="/login"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--primary)] px-5 text-sm font-black text-white"
                >
                  {lang === "ar" ? "تسجيل الدخول" : "Login"}
                </Link>
              </div>
            ) : null}
          </div>
        }
      />

      <div className="page-section grid gap-6 pb-10 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <RefreshCcw className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {lang === "ar" ? "تقديم طلب إرجاع" : "Submit a return request"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {lang === "ar"
                    ? "اختر الطلب والصنف وسبب الإرجاع قبل الإرسال."
                    : "Select the order, item, and reason before submission."}
                </p>
              </div>
            </div>

            {submitted ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                {lang === "ar"
                  ? "تم استلام طلب الإرجاع وإضافته إلى سجلك."
                  : "Your return request was received and added to your history."}
              </div>
            ) : null}

            {!user ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold leading-7 text-slate-600">
                {lang === "ar"
                  ? "تسجيل الدخول مطلوب لعرض الطلبات المتاحة وربط طلب الإرجاع بحسابك."
                  : "You need to sign in to view eligible orders and link the return request to your account."}
              </div>
            ) : isLoadingOrders ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
                  />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold leading-7 text-slate-600">
                {lang === "ar"
                  ? "لا توجد طلبات مرتبطة بالحساب الحالي يمكن مراجعتها للإرجاع حالياً."
                  : "There are no orders linked to the current account that can be reviewed for return right now."}
              </div>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-slate-800">
                      {lang === "ar" ? "رقم الطلب" : "Order"}
                    </span>
                    <select
                      value={selectedOrderId}
                      onChange={(event) => setSelectedOrderId(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-teal-400"
                    >
                      {orders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.id} - {formatDate.format(new Date(order.createdAt))}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-slate-800">
                      {lang === "ar" ? "الصنف" : "Item"}
                    </span>
                    <select
                      value={selectedItemId}
                      onChange={(event) => setSelectedItemId(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-teal-400"
                    >
                      <option value="">
                        {lang === "ar" ? "الطلب بالكامل" : "Entire order"}
                      </option>
                      {selectedOrder?.items.map((item) => (
                        <option key={`${item.productId}-${item.name}`} value={item.productId}>
                          {item.name} × {item.quantity}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-800">
                    {lang === "ar" ? "سبب الإرجاع" : "Return reason"}
                  </span>
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value as ReturnReason)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-colors focus:border-teal-400"
                  >
                    {RETURN_REASONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {lang === "ar" ? option.labelAr : option.labelEn}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-800">
                    {lang === "ar" ? "تفاصيل الطلب" : "Request details"}
                  </span>
                  <textarea
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    rows={4}
                    placeholder={
                      lang === "ar"
                        ? "اكتب وصفاً مختصراً للحالة أو أي بيانات تدعم المراجعة."
                        : "Add a short description of the issue or any details that support the review."
                    }
                    className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-7 text-slate-700 outline-none transition-colors focus:border-teal-400"
                  />
                </label>

                {selectedOrder ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          {lang === "ar" ? "الطلب" : "Order"}
                        </p>
                        <p className="mt-1 text-sm font-black text-slate-950">{selectedOrder.id}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          {lang === "ar" ? "التاريخ" : "Date"}
                        </p>
                        <p className="mt-1 text-sm font-black text-slate-950">
                          {formatDate.format(new Date(selectedOrder.createdAt))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                          {lang === "ar" ? "الإجمالي" : "Total"}
                        </p>
                        <p className="mt-1 text-sm font-black text-slate-950">
                          {selectedOrder.total.toFixed(2)} {lang === "ar" ? "ج.م" : "EGP"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--primary)] px-6 text-sm font-black text-white transition-colors hover:bg-[var(--primary-strong)]"
                >
                  {lang === "ar" ? "إرسال الطلب" : "Submit request"}
                </button>
              </form>
            )}
          </div>

          <TermsList lang={lang} />
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {lang === "ar" ? "حالة الطلبات" : "Request status"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {lang === "ar"
                    ? "راجع آخر طلبات الإرجاع المرتبطة بحسابك."
                    : "Review the latest return requests linked to your account."}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {requests.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold leading-7 text-slate-600">
                  {lang === "ar"
                    ? "لا توجد طلبات إرجاع مسجلة للحساب الحالي."
                    : "No return requests are recorded for the current account."}
                </div>
              ) : (
                requests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-[1.6rem] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-950">{request.id}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {request.orderId} - {formatDate.format(new Date(request.createdAt))}
                        </p>
                      </div>
                      <span
                        className={getStatusTone(request.status).concat(
                          " inline-flex rounded-full border px-3 py-1 text-xs font-black",
                        )}
                      >
                        {formatReturnStatus(request.status, lang)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
                      <p>
                        {lang === "ar" ? "السبب:" : "Reason:"}{" "}
                        <span className="font-black text-slate-900">
                          {getReasonLabel(request.reason, lang)}
                        </span>
                      </p>
                      <p>
                        {lang === "ar" ? "النطاق:" : "Scope:"}{" "}
                        <span className="font-black text-slate-900">
                          {request.itemName ||
                            (lang === "ar" ? "الطلب بالكامل" : "Entire order")}
                        </span>
                      </p>
                      {request.details ? (
                        <p className="leading-7">{request.details}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
