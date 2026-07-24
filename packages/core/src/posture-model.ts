/**
 * Classificador de postura — pesos aprendidos, gerados por
 * services/ai/scripts/export_classifier.py. NÃO editar à mão.
 *
 * Por que existe: a regra escrita à mão (razão da caixa + geometria por
 * limiar) reprovou no gate com 28,8% de falso positivo. A razão de aspecto
 * confunde formato de raça com postura — dachshund em pé é largo, são-bernardo
 * deitado é quase quadrado. Este modelo aprende a partir da geometria relativa
 * dos 24 keypoints, que descreve postura independentemente do porte do cão.
 *
 * É uma regressão logística: 73 características -> 3 classes. A
 * normalização já está embutida nos pesos, então classificar é uma
 * multiplicação de matriz — microssegundos, sem runtime extra.
 *
 * Medido por validação cruzada 5-fold em 208 fotos rotuladas à mão:
 *   acurácia 81,2% sem abstenção
 *   com limiar de confiança 0,80: 1,0% de falso positivo por exercício
 *
 * Ordem das características (ver featuresFromDetection):
 *   [0]        razão de aspecto da caixa
 *   [1 + 3i]   x do keypoint i, relativo à caixa (0..1)
 *   [2 + 3i]   y do keypoint i, relativo à caixa (0..1)
 *   [3 + 3i]   confiança do keypoint i
 */

/** Ordem das classes nas linhas de POSTURE_WEIGHTS. */
export const POSTURE_MODEL_CLASSES = ["sitting", "standing", "lying"] as const;

export const POSTURE_MODEL_FEATURES = 73;

/** Pesos com a normalização já embutida. Uma linha por classe. */
export const POSTURE_WEIGHTS: readonly (readonly number[])[] = [
  [-0.268536, 0.354679, 1.892018, 0.153234, 0.321362, -0.032974, 0.866059, 0.227665, -3.236257, 0.765633, 0.537382, -0.749928, 0.154840, 0.261687, 0.513823, -0.228962, 0.177214, 0.854484, -0.066554, -0.243793, 2.788070, -0.391998, -0.562044, 1.317051, -0.695424, -0.498861, -0.637314, -0.093277, -0.460184, -0.853724, 0.212743, -0.243421, -0.333473, -0.135862, 0.109742, 1.612806, -0.053964, -0.011006, 2.540056, -0.956567, -0.093745, 0.959222, -0.810127, 0.246847, 1.135059, -0.396768, -0.244203, -0.111610, 0.173225, -0.048781, -0.419424, -1.542304, -0.167469, -0.289698, -0.247612, 0.641247, 0.514902, 0.454433, -0.503344, -0.001275, 1.247758, -0.421727, -1.369521, -8.388222, -0.745715, -0.189442, 8.291303, -0.994942, 0.146885, 9.539211, -0.605312, -1.066202, -17.813382],
  [-0.877781, -0.543849, 0.767343, -0.453750, -0.491010, 1.266638, -0.828233, -0.247824, 0.240566, -0.445874, 0.304637, 1.998679, 0.164630, 0.059353, -0.156062, 0.260433, 0.209124, -1.315713, -0.036088, -0.120362, 0.278316, 0.048319, 0.529229, 0.089838, 0.072193, 1.347036, -0.097544, -0.095455, -0.004132, 2.411024, 0.246205, -0.027168, 0.360095, 0.600328, -0.224521, -1.591319, 0.384550, -0.119262, -3.345360, 0.306597, 0.004926, -0.912653, 0.248355, -0.464258, 0.638905, -1.083151, -0.146431, 1.315541, -0.508853, -0.143559, -1.108792, -1.238513, -0.016347, -1.408233, 0.512674, -0.584026, -0.796427, 0.293870, 0.160433, -0.360386, 0.080975, -0.837247, -0.268521, 10.808401, -1.048461, -0.048406, 3.350933, -0.261882, -0.847427, -5.107372, 0.211276, -0.262198, 5.985488],
  [1.146317, 0.189170, -2.659362, 0.300517, 0.169649, -1.233664, -0.037826, 0.020159, 2.995690, -0.319758, -0.842020, -1.248751, -0.319470, -0.321040, -0.357761, -0.031471, -0.386337, 0.461229, 0.102642, 0.364154, -3.066386, 0.343678, 0.032815, -1.406889, 0.623232, -0.848175, 0.734857, 0.188733, 0.464316, -1.557299, -0.458948, 0.270589, -0.026622, -0.464466, 0.114779, -0.021487, -0.330586, 0.130267, 0.805304, 0.649971, 0.088819, -0.046569, 0.561772, 0.217411, -1.773964, 1.479920, 0.390633, -1.203931, 0.335627, 0.192340, 1.528216, 2.780817, 0.183815, 1.697931, -0.265061, -0.057220, 0.281525, -0.748304, 0.342911, 0.361661, -1.328734, 1.258974, 1.638043, -2.420183, 1.794176, 0.237849, -11.642236, 1.256824, 0.700543, -4.431846, 0.394037, 1.328400, 11.827893],
];

export const POSTURE_BIAS: readonly number[] = [-1.751064, 4.175242, -2.424176];
