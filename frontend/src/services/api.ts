// src/services/api.ts

const API_URL = import.meta.env.VITE_API_URL;

console.log("API_URL =", API_URL);

type QueryParams = Record<string, string | number | boolean>;

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  role: 'customer' | 'vendor';
};

type OrderPayload = {
  shippingAddress: string;
  phone: string;
  paymentMethod: string;
  paymentReference?: string;
};

type ReviewPayload = {
  productId: string;
  rating: number;
  comment: string;
};

type ProfilePayload = {
  fullName?: string;
  phone?: string;
  address?: string;
};

type ProductPayload = {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  imageUrl: string;
  images?: string[];
  sku: string;
};

type AssistantMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type AssistantProduct = {
  _id: string;
  name: string;
  price: number;
  imageUrl: string;
  stockQuantity: number;
  averageRating: number;
  vendor?: { fullName: string };
  category?: { name: string };
};

type AssistantResponse = {
  success: boolean;
  message: string;
  products: AssistantProduct[];
};

type UploadResponse = {
  success: boolean;
  data: {
    url: string;
  };
  message?: string;
};

type UploadMultipleResponse = {
  success: boolean;
  data: { url: string; publicId: string }[];
  message?: string;
};

const buildQueryString = (params: QueryParams = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  return searchParams.toString();
};

type AuthResponse = {
  token?: string;
  success?: boolean;
  user?: { role: string } & Record<string, unknown>;
  data?: unknown;
  message?: string;
};

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem("token");
  }

  setToken(token: string | null) {
    this.token = token;

    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: "include",
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, config);

      const contentType = response.headers.get("content-type");

      // Read response as text first
      const responseText = await response.text();

      // If the server returned HTML instead of JSON,
      // show the actual response in the console.
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Expected JSON but received:");
        console.error(responseText);

        throw new Error(
          "Server returned HTML instead of JSON. Check your backend URL or server."
        );
      }

      const data = JSON.parse(responseText);

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // ===============================
  // AUTH METHODS
  // ===============================

  async register(userData: RegisterPayload) {
    const response = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async login(credentials: LoginPayload) {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout() {
    await this.request("/auth/logout", {
      method: "POST",
    });

    this.setToken(null);
  }

  async getCurrentUser() {
    return this.request("/auth/me");
  }

  // ===============================
  // PRODUCT METHODS
  // ===============================

  async getProducts(params: QueryParams = {}) {
    const queryString = buildQueryString(params);
    return this.request(`/products${queryString ? "?" + queryString : ""}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  // ===============================
  // CATEGORY METHODS
  // ===============================

  async getCategories() {
    return this.request("/categories");
  }

  // ===============================
  // CART METHODS
  // ===============================

  async getCart() {
    return this.request("/cart");
  }

  async addToCart(productId: string, quantity = 1) {
    return this.request("/cart", {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async updateCartItem(productId: string, quantity: number) {
    return this.request(`/cart/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(productId: string) {
    return this.request(`/cart/${productId}`, {
      method: "DELETE",
    });
  }

  async clearCart() {
    return this.request("/cart/clear", {
      method: "DELETE",
    });
  }

  // ===============================
  // ORDER METHODS
  // ===============================

  async createOrder(orderData: OrderPayload) {
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  }

  async getMyOrders() {
    return this.request("/orders");
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async verifyPayment(reference: string) {
    return this.request("/orders/verify-payment", {
      method: "POST",
      body: JSON.stringify({ reference }),
    });
  }

  async confirmBankTransfer(orderId: string, transferReference: string) {
    return this.request(`/orders/${orderId}/confirm-transfer`, {
      method: "PUT",
      body: JSON.stringify({ transferReference }),
    });
  }

  async approvePayment(orderId: string) {
    return this.request(`/orders/${orderId}/approve-payment`, {
      method: "PUT",
    });
  }

  // ===============================
  // REVIEW METHODS
  // ===============================

  async getProductReviews(productId: string) {
    return this.request(`/reviews/product/${productId}`);
  }

  async createReview(reviewData: ReviewPayload) {
    return this.request("/reviews", {
      method: "POST",
      body: JSON.stringify(reviewData),
    });
  }

  // ===============================
  // WISHLIST METHODS
  // ===============================

  async getWishlist() {
    return this.request("/wishlist");
  }

  async addToWishlist(productId: string) {
    return this.request("/wishlist", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  }

  async removeFromWishlist(productId: string) {
    return this.request(`/wishlist/${productId}`, {
      method: "DELETE",
    });
  }

  // ===============================
  // VENDOR METHODS
  // ===============================

  async getVendorDashboard() {
    return this.request("/vendor/dashboard");
  }

  async getVendorProducts(params: QueryParams = {}) {
    const queryString = buildQueryString(params);
    return this.request(`/vendor/products${queryString ? "?" + queryString : ""}`);
  }

  async getVendorOrders(params: QueryParams = {}) {
    const queryString = buildQueryString(params);
    return this.request(`/vendor/orders${queryString ? "?" + queryString : ""}`);
  }

  // ===============================
  // USER PROFILE
  // ===============================

  async getProfile() {
    return this.request("/users/profile");
  }

  async updateProfile(profileData: ProfilePayload) {
    return this.request("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  }

  // ===============================
  // IMAGE UPLOAD
  // ===============================

  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append("image", file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    // Note: no "Content-Type" header here on purpose — the browser sets
    // the correct multipart/form-data boundary automatically when the
    // body is a FormData object. Setting it manually breaks the upload.

    try {
      const response = await fetch(`${API_URL}/upload/image`, {
        method: "POST",
        headers,
        credentials: "include",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      const responseText = await response.text();

      if (!contentType || !contentType.includes("application/json")) {
        console.error("Expected JSON but received:");
        console.error(responseText);
        throw new Error(
          "Server returned HTML instead of JSON during image upload. Check the upload endpoint URL."
        );
      }

      const data = JSON.parse(responseText) as UploadResponse;

      if (!response.ok) {
        throw new Error(data.message || "Image upload failed");
      }

      return data;
    } catch (error) {
      console.error("Image Upload Error:", error);
      throw error;
    }
  }

  async uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("images", file));

    const headers: HeadersInit = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    // No "Content-Type" here either — same reasoning as uploadImage above.

    try {
      const response = await fetch(`${API_URL}/upload/images`, {
        method: "POST",
        headers,
        credentials: "include",
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      const responseText = await response.text();

      if (!contentType || !contentType.includes("application/json")) {
        console.error("Expected JSON but received:");
        console.error(responseText);
        throw new Error(
          "Server returned HTML instead of JSON during image upload. Check the upload endpoint URL."
        );
      }

      const data = JSON.parse(responseText) as UploadMultipleResponse;

      if (!response.ok) {
        throw new Error(data.message || "Image upload failed");
      }

      return data;
    } catch (error) {
      console.error("Image Upload Error:", error);
      throw error;
    }
  }

  // ===============================
  // PRODUCT MANAGEMENT
  // ===============================

  async createProduct(productData: ProductPayload) {
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id: string, productData: ProductPayload) {
    return this.request(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: "DELETE",
    });
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  // ===============================
  // AI SHOPPING ASSISTANT
  // ===============================

  async chatWithAssistant(messages: AssistantMessage[]) {
    return this.request<AssistantResponse>("/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ messages }),
    });
  }
}

export const api = new ApiClient();
export default api;