import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Package, Star, X, ImagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: {
    _id: string;
    name: string;
  };
  imageUrl: string;
  images?: string[];
  sku: string;
  isActive: boolean;
}

// One image in the picker. If `file` is set, it's a newly chosen image
// still sitting on the user's device (not uploaded yet) and `url` is a
// local object-URL preview. If `file` is absent, `url` is already a
// Cloudinary URL (an existing product image, kept as-is on save).
interface ImageItem {
  id: string;
  url: string;
  file?: File;
}

const MAX_IMAGES = 8;

interface Category {
  _id: string;
  name: string;
}

export default function VendorProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stockQuantity: '',
    category: '',
    imageUrl: '',
    sku: '',
  });
  const [loading, setLoading] = useState(false);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkVendorAccess();
    fetchProducts();
    fetchCategories();
  }, []);

  const checkVendorAccess = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await api.getCurrentUser();
      if (response.success) {
        if (response.data.role !== 'vendor') {
          toast({
            title: "Access Denied",
            description: "Only vendors can access this page.",
            variant: "destructive",
          });
          navigate('/');
        }
      }
    } catch (error) {
      navigate('/auth');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.getVendorProducts();
      if (response.success) {
        const data: any = response.data;
        // Handles both a bare array response and a { products, total, page } shape
        setProducts(Array.isArray(data) ? data : data?.products ?? []);
      }
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products.",
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.getCategories();
      if (response.success) {
        setCategories(response.data);
        console.log('Categories loaded:', response.data); // Debug
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to load categories. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Reset the input so selecting the same file again later still fires
    // a change event.
    e.target.value = '';

    setImageItems((prev) => {
      const next = [...prev];

      for (const file of files) {
        if (next.length >= MAX_IMAGES) {
          toast({
            title: "Too many images",
            description: `You can only add up to ${MAX_IMAGES} images per product.`,
            variant: "destructive",
          });
          break;
        }

        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a valid image file`,
            variant: "destructive",
          });
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is too large. Maximum size is 5MB`,
            variant: "destructive",
          });
          continue;
        }

        next.push({
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
          url: URL.createObjectURL(file),
          file,
        });
      }

      return next;
    });
  };

  const removeImage = (id: string) => {
    setImageItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.file) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });
  };

  const makePrimary = (id: string) => {
    setImageItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category) {
      toast({
        title: "Category required",
        description: "Please select a category for your product.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload any newly-picked files (the ones that still carry a raw
      // `file`), and keep already-uploaded images (existing Cloudinary
      // URLs) as they are, preserving the order the vendor arranged them in.
      const newFiles = imageItems.filter((item) => item.file).map((item) => item.file as File);
      let uploadedUrls: string[] = [];

      if (newFiles.length > 0) {
        setUploadingImage(true);
        try {
          const uploadResponse = await api.uploadImages(newFiles);
          uploadedUrls = uploadResponse.data.map((result) => result.url);
        } catch (uploadError: any) {
          toast({
            title: "Image upload failed",
            description: uploadError.message || "Could not upload the images. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          setUploadingImage(false);
          return;
        }
        setUploadingImage(false);
      }

      let uploadCursor = 0;
      const finalImages = imageItems.map((item) =>
        item.file ? uploadedUrls[uploadCursor++] : item.url
      );

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        category: formData.category,
        imageUrl: finalImages[0] || '',
        images: finalImages,
        sku: formData.sku,
      };

      let response;
      if (editingProduct) {
        response = await api.updateProduct(editingProduct._id, productData);
        toast({ title: "Product updated successfully" });
      } else {
        response = await api.createProduct(productData);
        toast({ title: "Product created successfully" });
      }

      if (response.success) {
        setIsDialogOpen(false);
        resetForm();
        fetchProducts();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save product.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      stockQuantity: product.stockQuantity.toString(),
      category: product.category?._id || '',
      imageUrl: product.imageUrl || '',
      sku: product.sku || '',
    });
    // Revoke any leftover local preview URLs from a previous session in
    // this dialog, then load this product's existing images (falling
    // back to the single imageUrl for older products saved before
    // multi-image support existed).
    imageItems.forEach((item) => {
      if (item.file) URL.revokeObjectURL(item.url);
    });
    const existingImages = product.images?.length ? product.images : (product.imageUrl ? [product.imageUrl] : []);
    setImageItems(existingImages.map((url, index) => ({ id: `existing-${index}-${url}`, url })));
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.deleteProduct(id);
      if (response.success) {
        toast({ title: "Product deleted successfully" });
        fetchProducts();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      stockQuantity: '',
      category: '',
      imageUrl: '',
      sku: '',
    });
    setImageItems((prev) => {
      prev.forEach((item) => {
        if (item.file) URL.revokeObjectURL(item.url);
      });
      return [];
    });
  };

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">My Products</h1>
            <p className="text-muted-foreground">Manage your product inventory</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={loading || uploadingImage}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    disabled={loading || uploadingImage}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (₦) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      disabled={loading || uploadingImage}
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock">Stock Quantity *</Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                      required
                      disabled={loading || uploadingImage}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                      disabled={loading || uploadingImage}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No categories available
                          </div>
                        ) : (
                          categories.map((cat) => (
                            <SelectItem key={cat._id} value={cat._id}>
                              {cat.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {categories.length === 0 && (
                      <p className="text-xs text-orange-500 mt-1">
                        Please run the category seeder first
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="Optional"
                      disabled={loading || uploadingImage}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="imageUrl">Product Images</Label>
                  <Input
                    id="imageUrl"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesChange}
                    disabled={loading || uploadingImage || imageItems.length >= MAX_IMAGES}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Up to {MAX_IMAGES} images, 5MB each. Supported: JPG, PNG, WEBP, GIF. The starred
                    image is shown first to customers — click an image to make it the primary one.
                  </p>
                  {imageItems.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-3">
                      {imageItems.map((item, index) => (
                        <div
                          key={item.id}
                          className={cn(
                            'relative group h-24 w-24 rounded-lg overflow-hidden border-2',
                            index === 0 ? 'border-primary' : 'border-border'
                          )}
                        >
                          <img
                            src={item.url}
                            alt={`Product image ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                          {index === 0 ? (
                            <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground rounded-full p-1">
                              <Star className="h-3 w-3 fill-current" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => makePrimary(item.id)}
                              disabled={loading || uploadingImage}
                              title="Make primary image"
                              className="absolute bottom-1 left-1 bg-background/80 text-muted-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary"
                            >
                              <Star className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(item.id)}
                            disabled={loading || uploadingImage}
                            title="Remove image"
                            className="absolute top-1 right-1 bg-background/80 text-muted-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {imageItems.length < MAX_IMAGES && (
                        <label
                          htmlFor="imageUrl"
                          className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors"
                        >
                          <ImagePlus className="h-5 w-5" />
                          <span className="text-[10px] mt-1">Add more</span>
                        </label>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                    disabled={loading || uploadingImage}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading || uploadingImage}>
                    {loading
                      ? 'Saving...'
                      : uploadingImage
                        ? 'Uploading Image...'
                        : editingProduct
                          ? 'Update Product'
                          : 'Create Product'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {(products ?? []).length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No products yet</h2>
            <p className="text-muted-foreground mb-6">Start adding products to your store</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Product
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(products ?? []).map((product) => (
              <Card key={product._id} className="overflow-hidden">
                <div className="h-48 rounded-t-lg overflow-hidden bg-muted relative">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {!product.isActive && (
                    <Badge className="absolute top-2 right-2" variant="destructive">
                      Inactive
                    </Badge>
                  )}
                  {product.stockQuantity === 0 && (
                    <Badge className="absolute top-2 left-2" variant="destructive">
                      Out of Stock
                    </Badge>
                  )}
                </div>
                <CardHeader>
                  <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-primary">
                        ₦{product.price.toLocaleString()}
                      </span>
                      <Badge variant="outline">{product.category?.name}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stock:</span>
                      <span className={product.stockQuantity < 10 ? 'text-orange-500' : ''}>
                        {product.stockQuantity}
                      </span>
                    </div>
                    {product.sku && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">SKU:</span>
                        <span className="font-mono text-xs">{product.sku}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(product._id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}