import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import axios from "axios";

import Messsage from "../../components/Message";
import Loader from "../../components/Loader";

import {
  useDeliverOrderMutation,
  useGetOrderDetailsQuery,
  usePayOrderMutation,
} from "../../redux/api/orderApiSlice";

const Order = () => {
  const { id: orderId } = useParams();

  const {
    data: order,
    refetch,
    isLoading,
    error,
  } = useGetOrderDetailsQuery(orderId);

  const [payOrder, { isLoading: loadingPay }] = usePayOrderMutation();
  const [deliverOrder, { isLoading: loadingDeliver }] =
    useDeliverOrderMutation();

  const { userInfo } = useSelector((state) => state.auth);

  // ✅ Razorpay Handler
 const handleRazorpay = async () => {
  try {
    const { data } = await axios.post("/api/payment/create-order", {
      amount: order.totalPrice,
    });

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: "INR",
      name: "MERN Store",
      description: "Order Payment",
      order_id: data.id,
      handler: async function (response) {
        await payOrder({
          orderId,
          details: response,
        });
        refetch();
        toast.success("Order Paid Successfully");
      },
      theme: { color: "#ec4899" },
    };

    const razor = new window.Razorpay(options);
    razor.open();
  } catch (error) {
    console.error("Payment error:", error);
    toast.error("Payment failed");
  }
};

  const deliverHandler = async () => {
    await deliverOrder(orderId);
    refetch();
  };

  return isLoading ? (
    <Loader />
  ) : error ? (
    <Messsage variant="danger">{error?.data?.message}</Messsage>
  ) : (
    <div className="container flex flex-col ml-[10rem] md:flex-row">
      {/* LEFT SIDE */}
      <div className="md:w-2/3 pr-4">
        <div className="border gray-300 mt-5 pb-4 mb-5">
          {order.orderItems.length === 0 ? (
            <Messsage>Order is empty</Messsage>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-[80%]">
                <thead className="border-b-2">
                  <tr>
                    <th className="p-2">Image</th>
                    <th className="p-2">Product</th>
                    <th className="p-2 text-center">Quantity</th>
                    <th className="p-2">Unit Price</th>
                    <th className="p-2">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {order.orderItems.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover"
                        />
                      </td>

                      <td className="p-2">
                        <Link to={`/product/${item.product}`}>
                          {item.name}
                        </Link>
                      </td>

                      <td className="p-2 text-center">{item.qty}</td>
                      <td className="p-2 text-center">
                        ₹ {item.price.toLocaleString("en-IN")}
                      </td>
                      <td className="p-2 text-center">
                        ₹ {(item.qty * item.price).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="md:w-1/3">
        <div className="mt-5 border-gray-300 pb-4 mb-4">
          <h2 className="text-xl font-bold mb-2">Shipping</h2>

          <p className="mb-4 mt-4">
            <strong className="text-pink-500">Order:</strong> {order._id}
          </p>

          <p className="mb-4">
            <strong className="text-pink-500">Name:</strong>{" "}
            {order.user.username}
          </p>

          <p className="mb-4">
            <strong className="text-pink-500">Email:</strong>{" "}
            {order.user.email}
          </p>

          <p className="mb-4">
            <strong className="text-pink-500">Address:</strong>{" "}
            {order.shippingAddress.address},{" "}
            {order.shippingAddress.city},{" "}
            {order.shippingAddress.postalCode},{" "}
            {order.shippingAddress.country}
          </p>

          <p className="mb-4">
            <strong className="text-pink-500">Method:</strong>{" "}
            {order.paymentMethod}
          </p>

          {order.isPaid ? (
            <Messsage variant="success">
              Paid on {order.paidAt}
            </Messsage>
          ) : (
            <Messsage variant="danger">Not paid</Messsage>
          )}
        </div>

        <h2 className="text-xl font-bold mb-2 mt-[3rem]">
          Order Summary
        </h2>

        <div className="flex justify-between mb-2">
          <span>Items</span>
          <span>₹ {order.itemsPrice.toLocaleString("en-IN")}</span>
        </div>

        <div className="flex justify-between mb-2">
          <span>Shipping</span>
          <span>₹ {order.shippingPrice.toLocaleString("en-IN")}</span>
        </div>

        <div className="flex justify-between mb-2">
          <span>Tax</span>
          <span>₹ {order.taxPrice.toLocaleString("en-IN")}</span>
        </div>

        <div className="flex justify-between mb-2 font-bold">
          <span>Total</span>
          <span>₹ {order.totalPrice.toLocaleString("en-IN")}</span>
        </div>

        {/* PAYMENT BUTTON */}
        {!order.isPaid && (
          <div>
            {loadingPay && <Loader />}
            <button
              onClick={handleRazorpay}
              className="bg-green-600 text-white w-full py-3 rounded-lg mt-3"
            >
              Pay with Razorpay
            </button>
          </div>
        )}

        {loadingDeliver && <Loader />}

        {userInfo &&
          userInfo.isAdmin &&
          order.isPaid &&
          !order.isDelivered && (
            <div>
              <button
                type="button"
                className="bg-pink-500 text-white w-full py-2 mt-3"
                onClick={deliverHandler}
              >
                Mark As Delivered
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default Order;
